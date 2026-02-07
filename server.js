const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


const app = express();
const PORT = process.env.PORT || 3000;

// Database Connection
const dbPath = path.resolve(__dirname, 'db/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Fake Data Arrays
const titles = [
    "The Future of AI in Daily Life",
    "Top 10 Travel Destinations for 2026",
    "How to Bake the Perfect Sourdough",
    "Understanding Quantum Computing",
    "Minimalism: A Guide to Decluttering",
    "The Rise of Electric Vehicles",
    "10 Tips for Better Sleep",
    "Exploring the Deep Ocean",
    "The History of Coffee",
    "Why Learning to Code is Essential"
];

const images = [
    "https://picsum.photos/seed/tech/600/400",
    "https://picsum.photos/seed/travel/600/400",
    "https://picsum.photos/seed/food/600/400",
    "https://picsum.photos/seed/nature/600/400",
    "https://picsum.photos/seed/city/600/400"
];

// Helper: Generate Lorem Ipsum
function generateLoremIpsum() {
    return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
}

// ---------------------------------------------------------
// ARTICLE GENERATION LOGIC
// ---------------------------------------------------------
function generateArticle(manual = false) {
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const content = generateLoremIpsum();

    const stmt = db.prepare("INSERT INTO articles (title, content, imageUrl) VALUES (?, ?, ?)");
    stmt.run([randomTitle, content, randomImage], function (err) {
        if (err) {
            console.error("Error inserting article:", err.message);
        } else {
            console.log(`New article generated: "${randomTitle}" (ID: ${this.lastID}) ${manual ? '[Manual]' : '[Auto]'}`);
        }
    });
    stmt.finalize();
}

// ---------------------------------------------------------
// SCHEDULER (Every 10 minutes)
// ---------------------------------------------------------
// ---------------------------------------------------------
// SCHEDULER (Publish Scheduled Articles: Every Minute)
// ---------------------------------------------------------
cron.schedule('* * * * *', () => {
    const now = new Date();
    // Format now to match input datetime-local format (YYYY-MM-DDTHH:mm) approximately, 
    // or better yet, just use simple string comparison if stored as ISO.
    // However, datetime-local input sends 'YYYY-MM-DDTHH:mm'.
    // We will compare against that.

    // Simple ISO string creation for comparison (local time approximation)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    console.log(`Checking for scheduled articles... (Current: ${currentDateTime})`);

    db.all("SELECT * FROM articles WHERE status = 'scheduled' AND scheduledTime <= ?", [currentDateTime], (err, rows) => {
        if (err) {
            console.error("Error checking scheduled articles:", err);
            return;
        }

        rows.forEach(article => {
            db.run("UPDATE articles SET status = 'published', scheduledTime = NULL WHERE id = ?", [article.id], (err) => {
                if (err) console.error("Error publishing article:", err);
                else console.log(`Auto-published article: "${article.title}" (ID: ${article.id})`);
            });
        });
    });
});

// ---------------------------------------------------------
// SCHEDULER (Auto-Generator Heartbeat: Every Minute)
// ---------------------------------------------------------
cron.schedule('* * * * *', () => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0-6 (Sun-Sat)
    const currentDayOfMonth = now.getDate(); // 1-31
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    console.log(`Scheduler Heartbeat: ${currentTime}`);

    db.all("SELECT * FROM schedules", [], (err, rows) => {
        if (err) {
            console.error("Scheduler DB Error:", err);
            return;
        }

        rows.forEach(schedule => {
            let shouldRun = false;

            if (schedule.time === currentTime) {
                if (schedule.frequency === 'daily') {
                    shouldRun = true;
                } else if (schedule.frequency === 'weekly' && schedule.dayOfWeek === currentDayOfWeek) {
                    shouldRun = true;
                } else if (schedule.frequency === 'monthly' && schedule.dayOfMonth === currentDayOfMonth) {
                    shouldRun = true;
                }
            }

            if (shouldRun) {
                console.log(`Executing schedule ID ${schedule.id} (${schedule.frequency})`);
                generateArticle();
            }
        });
    });
});

// ---------------------------------------------------------
// ROUTES
// ---------------------------------------------------------

// Home Page
app.get('/', (req, res) => { // Only show published articles
    db.all("SELECT * FROM articles WHERE status IS NULL OR status = 'published' ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database Error");
        }
        res.render('index', { articles: rows });
    });
});

// Admin Panel
app.get('/admin', (req, res) => {
    db.all("SELECT * FROM articles ORDER BY timestamp DESC", [], (err, articles) => {
        if (err) return res.status(500).send("Database Error");

        db.all("SELECT * FROM schedules", [], (err, schedules) => {
            if (err) {
                console.error("Error fetching schedules:", err);
                return res.status(500).send("Database Error");
            }
            res.render('admin', { articles, schedules });
        });
    });
});

// Edit Article Page
app.get('/admin/edit/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM articles WHERE id = ?", [id], (err, article) => {
        if (err) return res.status(500).send("Database Error");
        if (!article) return res.status(404).send("Article not found");
        res.render('edit_article', { article });
    });
});

// API: Update Article
app.post('/api/edit-article/:id', upload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'videoFile', maxCount: 1 }]), (req, res) => {
    const id = req.params.id;
    let { title, content, imageUrl, videoUrl, scheduledTime, status } = req.body;

    // Check for uploaded files
    if (req.files['imageFile'] && req.files['imageFile'][0]) {
        imageUrl = '/uploads/' + req.files['imageFile'][0].filename;
    }

    if (req.files['videoFile'] && req.files['videoFile'][0]) {
        videoUrl = '/uploads/' + req.files['videoFile'][0].filename;
    }

    // Logic: If updating, check if status should change based on scheduledTime
    // If user explicitly sets status to 'published', we define it.
    // If user sets a scheduledTime, we strict it to 'scheduled'.

    if (scheduledTime) {
        status = 'scheduled';
    } else {
        // If clearing scheduledTime, default to published if not provided
        status = 'published';
    }

    const stmt = db.prepare("UPDATE articles SET title = ?, content = ?, imageUrl = ?, videoUrl = ?, status = ?, scheduledTime = ? WHERE id = ?");
    stmt.run([title, content, imageUrl, videoUrl, status, scheduledTime || null, id], function (err) {
        if (err) {
            console.error("Error updating article:", err);
            return res.status(500).send("Database Error");
        }
        console.log(`Article updated: "${title}" (ID: ${id})`);
        res.redirect('/admin');
    });
    stmt.finalize();
});

// API: Manually Generate Article (Random)
app.post('/api/generate-article', (req, res) => {
    generateArticle(true);
    setTimeout(() => {
        res.redirect('/admin');
    }, 500);
});

// API: Create Article (Custom)
app.post('/api/create-article', upload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'videoFile', maxCount: 1 }]), (req, res) => {
    let { title, content, imageUrl, videoUrl, scheduledTime } = req.body;
    let status = 'published';

    // Check for uploaded files and use them if present
    if (req.files['imageFile'] && req.files['imageFile'][0]) {
        imageUrl = '/uploads/' + req.files['imageFile'][0].filename;
    }

    if (req.files['videoFile'] && req.files['videoFile'][0]) {
        videoUrl = '/uploads/' + req.files['videoFile'][0].filename;
    }

    // Basic Validation
    if (!title || !content) {
        return res.status(400).send("Title and Content are required.");
    }

    // Determine status based on scheduledTime
    if (scheduledTime) {
        status = 'scheduled';
    }

    const stmt = db.prepare("INSERT INTO articles (title, content, imageUrl, videoUrl, status, scheduledTime) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run([title, content, imageUrl || null, videoUrl || null, status, scheduledTime || null], function (err) {
        if (err) {
            console.error("Error creating article:", err.message);
            return res.status(500).send("Database Error");
        }
        console.log(`New article created: "${title}" (ID: ${this.lastID}) [${status}]`);
        res.redirect('/admin');
    });
    stmt.finalize();
});

// API: Delete Article
app.post('/api/delete-article/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM articles WHERE id = ?", id, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send("Error deleting article");
        }
        console.log(`Article deleted: ID ${id}`);
        res.redirect('/admin');
    });
});

// API: Create Schedule
app.post('/api/schedules', (req, res) => {
    const { frequency, time, dayOfWeek, dayOfMonth } = req.body;
    db.run("INSERT INTO schedules (frequency, time, dayOfWeek, dayOfMonth) VALUES (?, ?, ?, ?)",
        [frequency, time, dayOfWeek || null, dayOfMonth || null],
        function (err) {
            if (err) console.error(err);
            res.redirect('/admin');
        }
    );
});

// API: Delete Schedule
app.post('/api/schedules/delete/:id', (req, res) => {
    db.run("DELETE FROM schedules WHERE id = ?", req.params.id, function (err) {
        if (err) console.error(err);
        res.redirect('/admin');
    });
});

// Start Server
// Export the app for Vercel
module.exports = app;

// Only listen if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}
