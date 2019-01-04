var server = require('./server');
var system = require('./system');

// --- CONSTANTS --- //

var HTTP_PORTS = [80, 8080];
var HTTPS_PORTS = [443, 8443];

// --- STARTUP --- //

HTTP_PORTS.forEach(function(port) {
    server.listenHttp(port);
});
HTTPS_PORTS.forEach(function(port) {
    server.listenHttps(port);
});

// Call cpu usage and memory usage to initialize them
system.cpuUsage();
system.memoryUsage();