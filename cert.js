// HTTPS Certificate Util
// Uses openssl to create certificates
// Loads and generates the ceritifcates in sync

var fs = require('fs');
var child_process = require('child_process');

var KEY = 'key.pem';
var CERT = 'cert.pem';

if (!fs.existsSync(KEY) || !fs.existsSync(CERT)) {
    // Certificates don't exist, generate them
    console.log('Could not find a https certificate, generating them...');
    // TODO Add error checks
    child_process.execSync("openssl req -x509 -newkey rsa:4096 -sha256 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'");
}

exports.options = {
    key: fs.readFileSync(KEY),
    cert: fs.readFileSync(CERT)
};