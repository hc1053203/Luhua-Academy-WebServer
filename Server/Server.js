const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');
const cors = require('express');

const app = express();
const port = 3000;

app.use(cors());
app.use("/photo_album",exress.static(path.join(__dirname,"photh_album")));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@Edwin0927",
    database: "photo_album"
});

db.connect(err => {
    if (err) {
        console.error("❌ 無法連接 MySQL:", err);
        return;
    }
    console.log("✅ 成功連接 MySQL！");
});

const folderPath = path.resolve(__dirname, '../photo_album/2025.01.18'); // 取得正確的圖片資料夾路徑
const albumName = '2025.01.18';  
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('❌ 無法讀取資料夾:', err);
        return;
    }
    const imageFiles = files.filter(file =>
        imageExtensions.includes(path.extname(file).toLowerCase())
    );

    console.log('🔍 找到的圖片檔案:', imageFiles);
    imageFiles.forEach(filename => {
        const filePath = `photo_album/${albumName}/${filename}`;
        db.query("SELECT COUNT(*) AS count FROM photos WHERE filename = ?", [filename], (err, result) => {
            if (err) {
                console.error("❌ 無法查詢 MySQL:", err);
                return;
            }

            if (result[0].count === 0) {
                db.query(
                    "INSERT INTO photos (filename, file_path, album) VALUES (?, ?, ?)",
                    [filename, filePath, albumName],
                    (err) => {
                        if (err) {
                            console.error("❌ 插入圖片失敗:", err);
                        } else {
                            console.log(`✅ 已新增圖片至資料庫: ${filename}`);
                        }
                    }
                );
            } else {
                console.log(`ℹ️ 圖片已存在於資料庫: ${filename}`);
            }
        });
    });
});

app.get("/api/photos", (req, res) => {
    const sql = "SELECT filename, file_path FROM photos";
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

app.listen(port, () => {
    console.log(`📡 伺服器運行中: http://localhost:${port}`);
});