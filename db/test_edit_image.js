const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testEditImage() {
    console.log("Starting Edit Image Test...");

    // 1. Create a dummy file to upload
    const dummyPath = path.resolve(__dirname, 'dummy_test_image.txt');
    fs.writeFileSync(dummyPath, 'fake image content');

    // 2. We need a valid article ID. Let's assume ID 1 exists or use the most recent one.
    // For specific testing, let's create one first to be sure.

    // Create Article
    const createForm = new FormData();
    createForm.append('title', 'Temp Article for Edit Test');
    createForm.append('content', 'Content');
    createForm.append('imageUrl', 'http://original.url/img.jpg');

    let articleId;
    try {
        await axios.post('http://localhost:3000/api/create-article', createForm);
        console.log("Created temp article.");
        // We can't easily get the ID from the redirect/response without parsing HTML or DB.
        // Let's assume we can fetch it via admin or we just query DB directly.
        // For this script, let's use sqlite3 to get the last ID.
    } catch (e) {
        console.log("Create might have redirected (expected).");
    }

    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, '../database.sqlite');
    const db = new sqlite3.Database(dbPath);

    db.get("SELECT id, imageUrl FROM articles ORDER BY id DESC LIMIT 1", async (err, row) => {
        if (err || !row) {
            console.error("Failed to fetch article for test.");
            return;
        }
        articleId = row.id;
        console.log(`Testing with Article ID: ${articleId}, Current Image: ${row.imageUrl}`);

        // 3. Perform Edit with File Upload
        const editForm = new FormData();
        editForm.append('title', 'Edited Title');
        editForm.append('content', 'Edited Content');
        // IMPORTANT: We do NOT send imageUrl field to simulate "changing file" (which might leave the text input as is or empty?)
        // In the browser, the text input usually retains the old value unless cleared.
        // Let's simulate: User leaves the old URL in the text box BUT uploads a file.
        editForm.append('imageUrl', row.imageUrl);
        editForm.append('imageFile', fs.createReadStream(dummyPath));

        try {
            await axios.post(`http://localhost:3000/api/edit-article/${articleId}`, editForm, {
                headers: editForm.getHeaders(),
                maxRedirects: 0,
                validateStatus: status => status === 302
            });
            console.log("Edit request sent.");
        } catch (e) {
            console.error("Edit failed:", e.message);
        }

        // 4. Verify Update
        db.get("SELECT imageUrl FROM articles WHERE id = ?", [articleId], (err, updatedRow) => {
            if (updatedRow) {
                console.log(`Updated Image URL: ${updatedRow.imageUrl}`);
                if (updatedRow.imageUrl.startsWith('/uploads/')) {
                    console.log("SUCCESS: Image file updated successfully.");
                } else {
                    console.error("FAILURE: Image URL did not change to upload path.");
                }
            }
            // cleanup
            fs.unlinkSync(dummyPath);
            db.close();
        });
    });
}

testEditImage();
