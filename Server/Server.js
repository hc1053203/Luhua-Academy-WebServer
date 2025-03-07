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

// 📂 **🔹 掃描 `photo_album/` 內的所有相簿**
function scanAndCreateTables() {
    const albumRoot = path.join(__dirname, "../photo_album");

    fs.readdir(albumRoot, (err, folders) => {
        if (err) {
            console.error("❌ 無法讀取 photo_album 資料夾:", err);
            return;
        }

        folders.forEach(album => {
            const albumPath = path.join(albumRoot, album);

            // 確保是資料夾（而非檔案）
            if (fs.statSync(albumPath).isDirectory()) {
                console.log(`📂 偵測到相簿: ${album}`);
                createAlbumTable(album);
            }
        });
    });
}

// 🔹 **為每個相簿創建 MySQL 資料表**
function createAlbumTable(album) {
    const tableName = `${album.replace(/\W/g, "_")}`; // 避免 SQL 不允許的字元

    const sql = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            album VARCHAR(100) NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    db.query(sql, (err) => {
        if (err) {
            console.error(`❌ 創建相簿 ${album} 的資料表失敗:`, err);
        } else {
            console.log(`✅ 資料表 ${tableName} 創建成功！`);
            scanAndInsertImages(album);
        }
    });
}

// 🔹 **掃描相簿內的圖片，並存入資料庫**
function scanAndInsertImages(album) {
    const albumPath = path.join(__dirname, `../photo_album/${album}`);

    const tableName = `${album.replace(/\W/g, "_")}`;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

    fs.readdir(albumPath, (err, files) => {
        if (err) {
            console.error(`❌ 無法讀取相簿 ${album} 資料夾:`, err);
            return;
        }

        const imageFiles = files.filter(file =>
            imageExtensions.includes(path.extname(file).toLowerCase())
        );

        console.log(`📸 在 ${album} 找到 ${imageFiles.length} 張圖片`);

        imageFiles.forEach(filename => {
            const filePath = `photo_album/${album}/${filename}`;
            const sql = `
                INSERT INTO ${tableName} (filename, file_path, album)
                SELECT ?, ?, ? WHERE NOT EXISTS (
                    SELECT 1 FROM ${tableName} WHERE filename = ?
                );
            `;

            db.query(sql, [filename, filePath, album, filename], (err) => {
                if (err) {
                    console.error(`❌ 插入圖片 ${filename} 失敗:`, err);
                } else {
                    console.log(`✅ 圖片 ${filename} 已新增至資料庫！`);
                }
            });
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

        const sql = `SELECT filename, file_path FROM \`${tableName}\``;
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

// 📂 **🔹 讓前端檔案可以透過 Express 提供**
const frontendPath = path.join(__dirname, "../");
app.use(express.static(frontendPath));

// 讓 `/` 預設開啟 `blog-1.html`
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "blog-1.html"));
});

// 🔹 **啟動伺服器**
app.listen(port, () => {
    console.log(`📡 伺服器運行中: http://localhost:${port}`);
});
