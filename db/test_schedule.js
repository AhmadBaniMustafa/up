const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const now = new Date();
// Add 1 minute to current time for the test
const testTime = new Date(now.getTime() + 60000);
const hours = testTime.getHours().toString().padStart(2, '0');
const minutes = testTime.getMinutes().toString().padStart(2, '0');
const timeString = `${hours}:${minutes}`;

console.log(`Setting up test schedule for ${timeString} (Daily)`);

db.serialize(() => {
    db.run("INSERT INTO schedules (frequency, time) VALUES (?, ?)", ['daily', timeString], function (err) {
        if (err) console.error(err);
        else console.log(`Schedule created with ID ${this.lastID}`);
    });
});

db.close();
