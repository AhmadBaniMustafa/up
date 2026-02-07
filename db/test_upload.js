const http = require('http');
const fs = require('fs');
const path = require('path');

const boundary = '--------------------------' + Date.now().toString(16);
const filePath = path.join(__dirname, 'test_image.txt');
fs.writeFileSync(filePath, 'This is a dummy image content');

const fileContent = fs.readFileSync(filePath);
const filename = 'test_image.txt';

let body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nTest Upload Article\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="content"\r\n\r\nThis article has an uploaded image.\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="imageFile"; filename="${filename}"\r\nContent-Type: text/plain\r\n\r\n`),
    fileContent,
    Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/create-article',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
    }
};

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);
    if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log("Upload test successful (redirect/success).");
    }
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(body);
req.end();
