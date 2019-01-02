const server = require('./server');
const system = require('./system');

// --- CONSTANTS --- \\

const PORTS = [80, 8080];

// --- STARTUP --- \\

PORTS.forEach(function(port) {
    server.listen(port);
});

// Call cpu usage and memory usage to initialize them
system.cpuUsage();
system.memoryUsage();