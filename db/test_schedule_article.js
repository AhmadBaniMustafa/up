const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testScheduledArticle() {
    const form = new FormData();
    form.append('title', 'Test Scheduled Article');
    form.append('content', 'This should be scheduled.');

    // Schedule for 1 minute in the future
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const scheduledTime = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

    form.append('scheduledTime', scheduledTime);

    try {
        const response = await axios.post('http://localhost:3000/api/create-article', form, {
            headers: {
                ...form.getHeaders()
            },
            maxRedirects: 0,
            validateStatus: status => status === 302
        });
        console.log("Create request successful (Redirected).");
        console.log("Scheduled Time sent:", scheduledTime);
    } catch (error) {
        console.error("Error creating article:", error.message);
    }
}

testScheduledArticle();
