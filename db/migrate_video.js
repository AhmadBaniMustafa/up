const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE articles ADD COLUMN videoUrl TEXT", (err) => {
        if (err) {
            // Ignore if column already exists
            if (err.message.includes("duplicate column")) {
                console.log("Column videoUrl already exists.");
            } else {
                console.error("Error adding column:", err.message);
            }
        } else {
            console.log("Column videoUrl added successfully.");
        }
    });
});

db.close();
