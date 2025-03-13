// 🔹 引入所需的模組
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");

const app = express();
const port = 3000;

// 允許跨域請求，避免 CORS 限制
app.use(cors());

// 讓 `photo_album/` 內的圖片可以透過 `http://localhost:3000/photo_album/...` 存取
app.use("/photo_album", express.static(path.join(__dirname, "photo_album")));

// 執行掃描
scanAndCreateTables();
// 🔹 連接 MySQL 資料庫
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@Edwin0927", // ⚠️ 請更換為你的 MySQL 密碼
    database: "photo_album"
});

db.connect(err => {
    if (err) {
        console.error("❌ 無法連接 MySQL:", err);
        return;
    }
    console.log("✅ 成功連接 MySQL！");
    scanAndCreateTables();
});

function scanAndCreateTables() {
    const albumRoot = path.join(__dirname, "../ImageData");

    fs.readdir(albumRoot, (err, folders) => {
        if (err) {
            console.error("❌ 無法讀取 ImageData 資料夾:", err);
            return;
        }

        folders.forEach(album => {
            const albumPath = path.join(albumRoot, album);

            // 確保是資料夾（而非檔案）
            fs.stat(albumPath, (err, stats) => {
                if (err || !stats.isDirectory()) {
                    return;
                }

                console.log(`📂 偵測到相簿: ${album}`);

                db.query('SHOW TABLES LIKE ?', [album], (err, results) => {
                    if (err) {
                        console.error("❌ 查詢表格時發生錯誤:", err);
                        return;
                    }

                    if (results.length === 0) {
                        console.log("🔧 未找到表格，正在建立新表格...");
                        createAlbumTable(album);
                        syncDatabaseWithLocalFiles(album,albumPath);
                    } else {
                        syncDatabaseWithLocalFiles(album, albumPath);
                    }
                });
            });
        });
    });
}

// 創建表格
function createAlbumTable(album) {
    const sql = `
        CREATE TABLE ?? (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            filePath VARCHAR(500) NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.query(sql, [album], (err, result) => {
        if (err) {
            console.error(`❌ 建立表格 ${album} 失敗:`, err);
        } else {
            console.log(`✅ 已建立相簿表格: ${album}`);
        }
    });
}

// 同步 MySQL 資料與本地檔案
function syncDatabaseWithLocalFiles(album, albumPath) {
    // 讀取本地相簿內的檔案
    fs.readdir(albumPath, (err, localFiles) => {
        if (err) {
            console.error(`❌ 無法讀取 ${album} 內的檔案:`, err);
            return;
        }

        // 讀取資料庫內的檔案清單
        db.query(`SELECT filename FROM ??`, [album], (err, results) => {
            if (err) {
                console.error(`❌ 查詢 ${album} 內的資料庫檔案時發生錯誤:`, err);
                return;
            }

            const dbFiles = results.map(row => row.filename);

            // 比對缺少的本地檔案（應該刪除的檔案）
            const missingLocalFiles = dbFiles.filter(file => !localFiles.includes(file));

            // 比對缺少的資料庫檔案（應該新增的檔案）
            const missingDbFiles = localFiles.filter(file => !dbFiles.includes(file));

            if (missingLocalFiles.length > 0) {
                console.log("⚠️ 缺少的本地檔案（即將從資料庫刪除）:", missingLocalFiles);
                const sql = `DELETE FROM ?? WHERE filename IN (?)`;
                db.query(sql, [album, missingLocalFiles], (err, result) => {
                    if (err) {
                        console.error("❌ 自動刪除失敗:", err);
                    } else {
                        console.log(`✅ 已刪除 ${result.affectedRows} 筆多餘的資料`);
                    }
                });
            }else{
                console.log("✅ 本地檔案與資料庫一致");
            }

            if (missingDbFiles.length > 0) {
                console.log("⚠️ 缺少資料庫檔案（即將新增至資料庫）:", missingDbFiles);

                const insertData = missingDbFiles.map(file => [file, `/ImageData/${album}/${file}`]);

                const sql = `INSERT INTO ?? (filename, filePath) VALUES ?`;
                db.query(sql, [album, insertData], (err, result) => {
                    if (err) {
                        console.error(`❌ 插入資料失敗:`, err);
                    } else {
                        console.log(`✅ 已新增 ${result.affectedRows} 筆檔案至資料庫`);
                    }
                });
            }else{
                console.log("✅ 本地檔案與資料庫一致");
            }
        });
    });
}

app.get("/api/photos/:album/count", (req, res) => {
    try {
        const albumName = req.params.album.replace(/\W/g, "_");
        const tableName = `${albumName}`;

        console.log(`🔍 查詢相簿 ${tableName} 的圖片數量`);

        // 確認表格是否存在
        const checkTableSQL = `SHOW TABLES LIKE ?`;
        db.query(checkTableSQL, [tableName], (err, results) => {
            if (err) {
                console.error(`❌ 檢查表格 ${tableName} 失敗:`, err);
                return res.status(500).json({ error: "資料庫錯誤", details: err.message });
            }

            if (results.length === 0) {
                console.warn(`⚠️ 相簿 ${tableName} 不存在`);
                return res.status(404).json({ error: "相簿不存在" });
            }

            // 查詢圖片數量
            const sql = `SELECT COUNT(*) AS total FROM \`${tableName}\``;
            db.query(sql, (err, results) => {
                if (err) {
                    console.error(`❌ 查詢 ${tableName} 內的圖片數量失敗:`, err);
                    return res.status(500).json({ error: "資料庫錯誤", details: err.message });
                }

                console.log(`✅ ${tableName} 內有 ${results[0].total} 張圖片`);
                res.json({ total: results[0].total });
            });
        });
    } catch (error) {
        console.error("❌ 伺服器錯誤:", error);
        res.status(500).json({ error: "伺服器錯誤", details: error.message });
    }
});

app.get("/api/photos/:album/image", (req, res) => {
    try {
        const albumName = req.params.album.replace(/\W/g, "_");
        const tableName = `${albumName}`;

        console.log(`📸 查詢相簿 ${tableName} 內的圖片`);

        const sql = `SELECT filename, filePath FROM \`${tableName}\``;
        db.query(sql, (err, results) => {
            if (err) {
                console.error(`❌ 查詢 ${tableName} 內的圖片失敗:`, err);
                return res.status(500).json({ error: "資料庫錯誤", details: err.message });
            }

            if (!results || results.length === 0) {
                console.warn(`⚠️ 相簿 ${tableName} 沒有圖片`);
                return res.status(404).json({ error: "相簿內沒有圖片" });
            }

            results.forEach(photo => {
                photo.file_path = `http://localhost:${port}/${photo.file_path}`;
            });

            console.log(`✅ ${tableName} 內的圖片查詢成功，共 ${results.length} 張圖片`);
            res.json(results);
        });
    } catch (error) {
        console.error("❌ 伺服器錯誤:", error);
        res.status(500).json({ error: "伺服器錯誤", details: error.message });
    }
});
app.get('/api/photos/:album/photo/:photo', (req, res) => {
    const { album, photo } = req.params;
    const tableName = album.replace(/\W/g, "_");

    const sql = `SELECT filePath FROM \`${tableName}\` WHERE filename LIKE ? LIMIT 1`;
    db.query(sql, [`${photo}%`], (err, results) => {
        if (err) {
            console.error(`❌ MySQL 查詢錯誤:`, err);
            return res.status(500).json({ error: "資料庫錯誤" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "圖片不存在" });
        }

        res.json({ file_path: `http://localhost:${port}/${results[0].filePath}` });
    });
});


// 📂 **🔹 讓前端檔案可以透過 Express 提供**
const frontendPath = path.join(__dirname, "../");
app.use(express.static(frontendPath));

// 讓 `/` 預設開啟 `blog-1.html`
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// 🔹 **啟動伺服器**
app.listen(port, () => {
    console.log(`📡 伺服器運行中: http://localhost:${port}`);
});
