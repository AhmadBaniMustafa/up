const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'db/database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

db.all("SELECT * FROM articles", [], (err, rows) => {
    if (err) {
        throw err;
    }
    console.log(`Found ${rows.length} articles.`);
    rows.forEach((row) => {
        console.log(`${row.id}: ${row.title}`);
    });
});

db.close();
