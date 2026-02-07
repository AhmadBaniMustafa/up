const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Add status column
    db.run("ALTER TABLE articles ADD COLUMN status TEXT DEFAULT 'published'", (err) => {
        if (err) {
            console.log("Column 'status' might already exist or error:", err.message);
        } else {
            console.log("Column 'status' added.");
        }
    });

    // Add scheduledTime column
    db.run("ALTER TABLE articles ADD COLUMN scheduledTime TEXT", (err) => {
        if (err) {
            console.log("Column 'scheduledTime' might already exist or error:", err.message);
        } else {
            console.log("Column 'scheduledTime' added.");
        }
    });
});

db.close(() => {
    console.log("Migration script finished.");
});
