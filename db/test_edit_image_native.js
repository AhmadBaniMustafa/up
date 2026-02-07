const fs = require('fs');
const path = require('path');

async function testEditImage() {
    console.log("Starting Edit Image Test (Native Fetch - attempt 3)...");

    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

    // 1. Create dummy file
    const dummyPath = path.resolve(__dirname, 'dummy_test_image.txt');
    fs.writeFileSync(dummyPath, 'fake image content');
    const fileContent = fs.readFileSync(dummyPath);

    function buildBody(fields, files) {
        const CRLF = '\r\n';
        const parts = [];

        for (const [key, value] of Object.entries(fields)) {
            parts.push(Buffer.from(`--${boundary}${CRLF}`));
            parts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"${CRLF}${CRLF}`));
            parts.push(Buffer.from(`${value}${CRLF}`));
        }

        for (const [key, file] of Object.entries(files)) {
            parts.push(Buffer.from(`--${boundary}${CRLF}`));
            parts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"; filename="${path.basename(file.path)}"${CRLF}`));
            parts.push(Buffer.from(`Content-Type: text/plain${CRLF}${CRLF}`));
            parts.push(Buffer.from(file.content));
            parts.push(Buffer.from(CRLF));
        }

        parts.push(Buffer.from(`--${boundary}--${CRLF}`));
        return Buffer.concat(parts);
    }

    // 2. Create Article
    console.log("Creating Temp Article...");
    const createBody = buildBody({
        title: 'Temp Article for Edit Test',
        content: 'Content',
        imageUrl: 'http://original.url/img.jpg'
    }, {});

    try {
        await fetch('http://localhost:3000/api/create-article', {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            body: createBody
        });
        console.log("Create request sent.");
    } catch (e) {
        console.error("Create failed:", e.message);
    }

    // 3. Get Last ID
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    const db = new sqlite3.Database(dbPath);

    setTimeout(() => {
        db.get("SELECT id, imageUrl FROM articles ORDER BY id DESC LIMIT 1", async (err, row) => {
            if (err || !row) {
                console.error("Failed to fetch article for test.");
                return;
            }
            const articleId = row.id;
            console.log(`Testing with Article ID: ${articleId}, Current Image: ${row.imageUrl}`);

            // 4. Edit with File
            const editBody = buildBody({
                title: 'Edited Title',
                content: 'Edited Content',
                imageUrl: row.imageUrl // simulate keeping old URL text
            }, {
                imageFile: { path: dummyPath, content: fileContent }
            });

            try {
                await fetch(`http://localhost:3000/api/edit-article/${articleId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                    body: editBody
                });
                console.log("Edit request sent.");
            } catch (e) {
                console.error("Edit failed:", e.message);
            }

            // 5. Verify
            setTimeout(() => {
                db.get("SELECT imageUrl FROM articles WHERE id = ?", [articleId], (err, updatedRow) => {
                    if (updatedRow) {
                        console.log(`Updated Image URL: ${updatedRow.imageUrl}`);
                        if (updatedRow.imageUrl.startsWith('/uploads/')) {
                            console.log("SUCCESS: Image file updated successfully.");
                        } else {
                            console.error("FAILURE: Image URL did not change to upload path.");
                        }
                    }
                    fs.unlinkSync(dummyPath);
                    db.close();
                });
            }, 1000);
        });
    }, 1000); // wait for creation
}

testEditImage();
