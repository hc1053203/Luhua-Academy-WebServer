const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

// 連接 MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@Edwin0927", // ⚠️ 請更換為你的 MySQL 密碼
    database: "photo_album"
});

// 確保資料庫連線成功
db.connect(err => {
    if (err) {
        console.error('❌ 無法連接到 MySQL:', err);
    } else {
        console.log('✅ 成功連接到 MySQL');
    }
});

function scanAndCreateTables(Path) {

    fs.readdir(Path, (err, folders) => {
        if (err) {
            console.error("❌ 無法讀取 ${Path} 資料夾:", err);
            return;
        }

        folders.forEach(album => {
            const albumPath = path.join(Path, album);

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
                        createAlbumTable(album,albumPath);
                    } else {
                        syncDatabaseWithLocalFiles(album, albumPath);
                    }
                });
            });
        });
    });
}

// 創建表格
function createAlbumTable(album,albumPath) {
    const sql = `
        CREATE TABLE ?? (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            filesize INT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.query(sql, [album], (err, result) => {
        if (err) {
            console.error(`❌ 建立表格 ${album} 失敗:`, err);
        } else {
            console.log(`✅ 已建立相簿表格: ${album}`);
            syncDatabaseWithLocalFiles(album,albumPath)
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

                const insertData = missingDbFiles.map(file => [file, fs.statSync(path.join(albumPath, file)).size]);

                const sql = `INSERT INTO ?? (filename, filesize) VALUES ?`;
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



scanAndCreateTables();
