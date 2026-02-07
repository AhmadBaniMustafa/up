const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function testEditScenarios() {
    console.log("Starting Comprehensive Edit Scenarios Test...");
    const boundary = '----WebKitFormBoundaryScenarioTest';
    const dummyPathA = path.resolve(__dirname, 'test_image_A.txt');
    const dummyPathB = path.resolve(__dirname, 'test_image_B.txt');
    fs.writeFileSync(dummyPathA, 'Image A Content');
    fs.writeFileSync(dummyPathB, 'Image B Content');

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

    const dbPath = path.resolve(__dirname, 'database.sqlite');
    const db = new sqlite3.Database(dbPath);

    // Scenario 1: Create with File A, then Edit with File B
    console.log("\n--- Scenario 1: File A -> File B ---");

    // 1. Create with File A
    const createBody = buildBody({
        title: 'Scenario 1 Article',
        content: 'Content'
    }, {
        imageFile: { path: dummyPathA, content: fs.readFileSync(dummyPathA) }
    });

    try {
        await fetch('http://localhost:3000/api/create-article', {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            body: createBody
        });
    } catch (e) { console.error("Create failed:", e.message); }

    // Wait and get ID
    await new Promise(r => setTimeout(r, 1000));

    db.get("SELECT id, imageUrl FROM articles ORDER BY id DESC LIMIT 1", async (err, row) => {
        if (!row) { console.error("Failed to fetch article."); return; }
        const id = row.id;
        console.log(`Created Article ID: ${id}, Image: ${row.imageUrl}`);

        // 2. Edit with File B
        // Simulate user NOT clearing the text input (which contains the old path)
        const editBody = buildBody({
            title: 'Scenario 1 Edited',
            content: 'Content Edited',
            imageUrl: row.imageUrl
        }, {
            imageFile: { path: dummyPathB, content: fs.readFileSync(dummyPathB) }
        });

        try {
            await fetch(`http://localhost:3000/api/edit-article/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                body: editBody
            });
        } catch (e) { console.error("Edit failed:", e.message); }

        await new Promise(r => setTimeout(r, 1000));

        db.get("SELECT imageUrl FROM articles WHERE id = ?", [id], (err, updatedRow) => {
            console.log(`Updated Image: ${updatedRow.imageUrl}`);
            if (updatedRow.imageUrl !== row.imageUrl && updatedRow.imageUrl.includes('test_image_B')) {
                // The filename is random timestamp + originalname. 
                // We can check if it CHANGED.
                console.log("SUCCESS: Image changed.");
            } else {
                // It's possible random suffix makes it different even if same content, but here names are different.
                // Actually originalname is used in extension. 'test_image_B.txt'.
                // Let's check if it's different.
                if (updatedRow.imageUrl !== row.imageUrl) {
                    console.log("SUCCESS: Image URL changed.");
                } else {
                    console.error("FAILURE: Image URL did not change.");
                }
            }

            // cleanup
            fs.unlinkSync(dummyPathA);
            fs.unlinkSync(dummyPathB);
            db.close();
        });
    });
}

testEditScenarios();
