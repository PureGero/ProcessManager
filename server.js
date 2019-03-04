var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url');
var querystring = require('querystring');
var cert = require('./cert');
var login = require('./login');
var pm2 = require('pm2');
const WebSocket = require('ws');

pm2.connect(function(err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }
    
    pm2.launchBus((err, bus) => {
        bus.on('log:out', data => {
            appendLog(data.process.pm_id, data.data.replace('\n',''));
        });
        bus.on('log:err', data => {
            appendLog(data.process.pm_id, data.data.replace('\n',''));
        });
    });
});

var MIMES = {
    'html': 'text/html; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'ico': 'image/x-icon'
};

var SERVERS = [];
var PAGES = {};
var LOG = {};
var INFO_LISTENERS = [];

function ifServerStillAlive(id, callback, timeout) {
    pm2.describe(id, (err, processDescription) => {
        if (err) {
            console.err(err);
            return;
        }
        var pid = processDescription.pid;
        setTimeout(() => {
            pm2.describe(id, (err, processDescription) => {
                if (err) {
                    console.err(err);
                    return;
                }
                if (pid == processDescription.pid) {
	                callback();
                }
            });
        }, timeout);
    });
}

function appendLog(id, log) {
    
    if (log.indexOf('The server has stopped responding!') > 0) {
        ifServerStillAlive(id, () => {
            pm2.restart(id, (err) => {});
        }, 15*1000);
    }
    
    id = id.toString();
    if (!(id in LOG))
        LOG[id] = [];
    LOG[id].push(log);
    if (LOG[id].length > 300) {
        LOG[id].splice(0, 50);
    }
    
    for (var i in INFO_LISTENERS) {
        if (INFO_LISTENERS[i].id == id) {
            INFO_LISTENERS[i].ws.send(log);
        }
    }
}

function parseQueryString(str) {
    var objURL = {};

    str.replace(
        new RegExp( "([^?=&]+)(=([^&]*))?", "g" ),
        function( $0, $1, $2, $3 ){
            objURL[ $1 ] = $3;
        }
    );
    return objURL;
};

function requestHandler(req, res) {
    console.log(req.url);
    // All pathnames in lowercase
    var page = url.parse(req.url).pathname.toLowerCase();
    var username = login.getUsernameFromCookies(req);
    if (username && page == '/') {
        indexPage(req, res);
    } else if (username && page.substr(1) in PAGES) {
        // Call the function with the pathname
        PAGES[page.substr(1)](req, res);
    } else if (!username && (page == '/' || page == '/login')) {
        // Not logged in
        loginPage(req, res);
    } else if (!username && page.substr(1) in PAGES) {
        // Page exists, but not logged in
        res.writeHead(303, {'Location': '/', 'Set-Cookie': 'sessid=; expires=Thu, 01 Jan 1970 00:00:00 GMT'});
        res.end();
    } else {
        res.writeHead(404);
        res.end('404 Not Found');
    }
}

function websocketHandler(ws, req) {
    console.log('ws://::' + req.url);
    var page = url.parse(req.url).pathname.toLowerCase();
    var username = login.getUsernameFromCookies(req);
    if (username) {
        if (page == '/info') {
            var process = parseQueryString(url.parse(req.url).search)['id'];
            INFO_LISTENERS.push({id: process, ws: ws});
            ws.on('close', () => {
                INFO_LISTENERS.splice(INFO_LISTENERS.indexOf(ws), 1);
            });
        }
    } else {
        res.writeHead(403);
        res.end('403');
    }
}

function readPost(req, res, callback) {
    var queryData = '';
        
    req.on('data', function(data) {
        queryData += data;
        if(queryData.length > 1e6) { // Too much data
            queryData = '';
            res.writeHead(413);
            res.end();
            req.connection.destroy();
        }
    });

    req.on('end', function() {
        var post = querystring.parse(queryData);
        callback(post);
    });
}

function doLogin(req, res, username, password) {
    login.login(username, password, (success) => {
        if (success) {
            // Login successful, take them to the homepage
            var id = login.setUsername(username);
            res.writeHead(303, {'Location': '/', 'Set-Cookie': 'sessid=' + id});
            res.end();
        } else {
            // Login failed, show them the login page again
            sendFile('login.html', req, res);
        }
    });
}

function indexPage(req, res) {
    sendFile('index.html', req, res);
}
PAGES.index = indexPage;

function loginPage(req, res) {
    if (req.method == 'POST') {
        readPost(req, res, (post) => {
            doLogin(req, res, post.username, post.password);
        });
    } else {
        sendFile('login.html', req, res);
    }
}
PAGES.login = loginPage;

function infoPage(req, res) {
    sendFile('info.html', req, res);
}
PAGES.info = infoPage;

function listProcesses(req, res) {
	pm2.list((err, processDescriptionList) => {
	    res.writeHead(200);
	    var o = [];
	    for (var i in processDescriptionList) {
	        o[i] = {};
	        o[i].name = processDescriptionList[i].name;
	        o[i].monit = processDescriptionList[i].monit;
	        o[i].pm_id = processDescriptionList[i].pm_id;
	        o[i].running = processDescriptionList[i].pid;
	    }
	    res.end(JSON.stringify(o));
	});
}
PAGES.list = listProcesses;

function processInfo(req, res) {
    var process = parseQueryString(url.parse(req.url).search)['id'];
	pm2.describe(process, (err, processDescription) => {
	    if (err) {
	        res.writeHead(500);
	        res.end("Beep beep I'm a broken sheep");
	        return;
	    }
	    res.writeHead(200);
	    var o = {};
	    processDescription = processDescription[0];
	    o.name = processDescription.name;
        o.monit = processDescription.monit;
        o.pm_id = processDescription.pm_id;
        o.running = processDescription.pid;
        o.log = LOG[process];
	    res.end(JSON.stringify(o));
	});
}
PAGES.processinfo = processInfo;

function stopProcess(req, res) {
    var process = parseQueryString(url.parse(req.url).search)['id'];
    appendLog(process, 'Received stop command');
	pm2.sendLineToStdin(process, 'stop', (err, res) => {});
	pm2.sendLineToStdin(process, 'end', (err, res) => {});
	pm2.sendLineToStdin(process, 'quit', (err, res) => {});
	pm2.stop(process, (err) => {});
    res.writeHead(200);
    res.end('OK');
}
PAGES.stop = stopProcess;

function restartProcess(req, res) {
    var process = parseQueryString(url.parse(req.url).search)['id'];
    appendLog(process, 'Received restart command');
	pm2.sendLineToStdin(process, 'stop', (err, res) => {});
	pm2.sendLineToStdin(process, 'end', (err, res) => {});
	pm2.sendLineToStdin(process, 'quit', (err, res) => {});
	ifServerStillAlive(process, () => {
	    pm2.restart(process, (err) => {});
	}, 10*1000);
    res.writeHead(200);
    res.end('OK');
}
PAGES.restart = restartProcess;

function sendFile(file, req, res) {
    var extension = file.substr(file.lastIndexOf('.') + 1);
    if (extension in MIMES) {
        res.writeHead(200, {'Content-Type': MIMES[extension]});
    } else {
        res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
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
    
    var ws = new WebSocket.Server({server});
    ws.on('connection', (socket, req) => {
        websocketHandler(socket, req);
    });
    
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