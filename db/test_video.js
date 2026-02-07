const axios = require('axios'); // Note: axios might not be installed, using http instead if needed or just fetch in newer node
// Actually, let's use standard http to avoid dependency issues if axios isn't there
const http = require('http');

const data = JSON.stringify({
    title: "Understanding Quantum Mechanics",
    content: "A deep dive into the world of quantum physics.",
    imageUrl: "",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/create-article',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);
    if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log("Article created successfully.");
    }
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
