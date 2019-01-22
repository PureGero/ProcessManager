// UNUSED - USING PM2 TO MANAGE THE PROCESSES

var fs = require('fs');
var spawn = require('child_process').spawn;

var user_data = 'user_data';
var processes = user_data + '/processes';
var CONSOLE_LINE_COUNT = 256;
var RESTART_TIMEOUT = 1; // seconds

// Mandatory keys {
//      name,
//      binPath,
//      user,
//      workingDirectory,
// Optional keys
//      preTerminateCommand,
// Unsaved keys
//      console,
//      process,
//      binIndex
// }
var PROCESSES = [];

function startProcess(process) {
    
}

function loadProcess(data) {
    var process = JSON.parse(data);
    PROCESSES.push(process);
    startProcess(process);
}

function getCpuTime(pid, callback) {
    fs.readFile("/proc/" + pid + "/stat", (err, data) => {
        if (err) {
            callback(0); // Probably on a unix system that doesn't do /proc
        } else {
            var elems = data.toString().split(' ');
            var utime = parseInt(elems[13]);
            var stime = parseInt(elems[14]);
            callback(utime + stime);
        }
    });
}

// --- Load and start all processes --- //

fs.readdir(processes, (err, files) => {
    if (err) {
        console.log(err);
    } else {
        files.forEach(file => {
            fs.readFile(processes + '/' + file, (err, data) => {
                if (err) {
                    console.log(err);
                } else {
                    loadProcess(data);
                }
            });
        });
    }
});

exports.load