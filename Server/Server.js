const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

// 連接 MySQL
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
});

const folderPath = path.resolve(__dirname, '../photo_album/2025.01.18'); // 取得正確的圖片資料夾路徑
const albumName = '2025.01.18';  // 設定相簿名稱
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('❌ 無法讀取資料夾:', err);
        return;
    }

    // 過濾圖片檔案
    const imageFiles = files.filter(file =>
        imageExtensions.includes(path.extname(file).toLowerCase())
    );

    console.log('🔍 找到的圖片檔案:', imageFiles);

    // 遍歷所有圖片，檢查是否已存在，若不存在則插入
    imageFiles.forEach(filename => {
        const filePath = `photo_album/${albumName}/${filename}`;

        // 檢查 MySQL 是否已經有這個圖片
        db.query("SELECT COUNT(*) AS count FROM photos WHERE filename = ?", [filename], (err, result) => {
            if (err) {
                console.error("❌ 無法查詢 MySQL:", err);
                return;
            }

            if (result[0].count === 0) {
                // 若資料庫內沒有此圖片，則插入新資料
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
