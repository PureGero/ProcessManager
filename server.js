var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url');
var processes = require('./processes');
var cert = require('./cert');

var MIMES = {
    'html': 'text/html, charset=utf-8',
    'js': 'application/javascript, charset=utf-8',
    'css': 'text/css, charset=utf-8',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'ico': 'image/x-icon'
};

var SERVERS = [];
var PAGES = {};

function requestHandler(req, res) {
    // All pathnames in lowercase
    var page = url.parse(req.url).pathname.toLowerCase();
    if (page == '/') {
        loginPage(req, res);
    } else if (page.substr(1) in PAGES) {
        // Call the function with the pathname
        PAGES[page.substr(1)](req, res);
    } else {
        res.writeHead(404);
        res.end('404 Not Found');
    }
}

function loginPage(req, res) {
    sendFile('login.html', req, res);
}
PAGES.login = loginPage;

function sendFile(file, req, res) {
    var extension = file.substr(file.lastIndexOf('.') + 1);
    if (extension in MIMES) {
        res.writeHead(200, {'Content-Type': MIMES[extension]});
    } else {
        res.writeHead(200, {'Content-Type': 'text/plain, charset=utf-8'});
    }
    fs.readFile('html/' + file, (err, data) => {
        if (err) throw err;
        res.end(data);
    });
}

function listenHttps(port) {
    var server = https.createServer(cert.options, requestHandler);
    server.listen(port);
    SERVERS.push(server);
    console.log('Listening on https port', port);
}

function requestHandlerHttp(req, res) {
    // Check if this 'Host' request field has been sent
    if (!req.headers.host) {
        res.writeHead(400);
        res.end('Missing header: Host');
        return;
    }
    // Redirect to HTTPS
    res.writeHead(307, {'Location': 'https://' + req.headers.host + '/'});
    res.end('Redirecting...');
}

function listenHttp(port) {
    var server = http.createServer(requestHandlerHttp);
    server.listen(port);
    SERVERS.push(server);
    console.log('Listening on http port', port);
}

exports.listenHttps = listenHttps;
exports.listenHttp = listenHttp;