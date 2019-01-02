var http = require('http');
var https = require('https');
var fs = require('fs');
var processes = require('./processes');
var cert = require('./cert');

var SERVERS = [];

function requestHandler(req, res) {
    res.writeHead(200);
    res.end('Hi everybody!');
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