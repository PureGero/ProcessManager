var os = require('os');

var history = [];

exports.totalMemory = os.totalmem;

exports.memoryUsage = function() {
    return 1 - os.freemem() / os.totalmem();
};

// Returns an array of objects with the keys [idle,sys,user]
// Eg a system with 2 cpus could return
//   [{idle:0.5,sys:0.25,user:0.25},{idle:0.7,sys:0.2,user:0.1}]
exports.cpusUsage = function() {
    var cpus = os.cpus();
    
    var out = [];
    
    for(var i = 0; i < cpus.length; i++) {
        var cpu = cpus[i], total = 0;
        var times = cpu.times;
        
        if (i in history) {
            times = {};
            for(var type in cpu.times) {
                times[type] = cpu.times[type] - history[i][type];
            }
        }
        history[i] = cpu.times;
        
        var outobj = {};
        
        for(var type in times) {
            total += times[type];
        }

        for(type in times) {
            outobj[type] = times[type] / total;
        }
        
        out.push(outobj);
    }
    
    return out;
}

function usage(type) {
    var cpus = exports.cpusUsage();
    var total = 0;
    for (var i = 0; i < cpus.length; i++) {
        total += cpus[i][type];
    }
    return total / cpus.length;
}

exports.idleUsage = function() {
    return usage('idle');
}

exports.cpuUsage = function() {
    return 1 - exports.idleUsage();
};