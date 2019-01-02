const http = require('http');
const fs = require('fs');
const processes = require('./processes');

var SERVERS = [];

function requestHandler(req, res) {
    res.writeHead(200);
    res.end('Hi everybody!');
}

function listen(port) {
    var server = http.createServer(requestHandler);
    server.listen(port);
    SERVERS.push(server);
    console.log('Listening on port', port);
}

exports.listen = listen;