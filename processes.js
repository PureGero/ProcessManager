var fs = require('fs');

var user_data = 'user_data';
var processes = user_data + '/processes';

var PROCESSES = [];

function startProcess(process) {
    
}

function loadProcess(data) {
    var process = JSON.parse(data);
    PROCESSES.push(process);
    startProcess(process);
}

fs.readdir(processes, (err, files) => {
    if (err) {
        console.log(err);
    } else {
        files.forEach(file => {
            fs.readFile(processes + '/' + file, function(err, data) {
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