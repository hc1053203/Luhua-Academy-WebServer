// 🔹 引入所需的模組
const fs = require("fs");             // 讀取檔案系統
const path = require("path");         // 處理路徑
const mysql = require("mysql2");      // 連接 MySQL
const express = require("express");   // 建立 Web 伺服器
const cors = require("cors");         // 允許跨來源請求

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
    password: "@Edwin0927", // 你的 MySQL 密碼
    database: "photo_album"
});

db.connect(err => {
    if (err) {
        console.error("❌ 無法連接 MySQL:", err);
        return;
    }
    console.log("✅ 成功連接 MySQL！");
    scanAndCreateTables();  // 啟動時自動掃描並建立資料表
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
    const tableName = `photos_${album.replace(/\W/g, "_")}`; // 避免 SQL 不允許的字元

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

    const tableName = `photos_${album.replace(/\W/g, "_")}`;
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

// 🔹 **API：獲取特定相簿的圖片**
app.get("/api/photos/:album", (req, res) => {
    const albumName = req.params.album.replace(/\W/g, "_");  // 確保表格名稱安全
    const tableName = `photos_${albumName}`;
    const sql = `SELECT filename, file_path FROM ${tableName}`;

    db.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: "資料庫錯誤" });
        } else {
            // 確保 `file_path` 是完整網址
            results.forEach(photo => {
                photo.file_path = `http://localhost:${port}/${photo.file_path}`;
            });
            res.json(results);
        }
    });
});

// 🔹 **啟動伺服器**
app.listen(port, () => {
    console.log(`📡 伺服器運行中: http://localhost:${port}`);
});
