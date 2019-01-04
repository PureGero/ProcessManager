var pam = require('authenticate-pam');

var SESSIONS = {};

function login(user, pass, callback) {
    pam.authenticate(user, pass, function(err) {
        callback(!err);
    });
}

function setUsername(username) {
    var id = Math.random().toString().substr(2);
    var session = {
        username: username,
        start: Date.now(),
        lastAccessed: Date.now(),
        id: id
    };
    SESSIONS[id] = session;
    return id;
}

function getUsername(id) {
    return SESSIONS[id] ? SESSIONS[id].username : null;
}

function getUsernameFromCookies(req) {
    return getUsername(getSessionIdFromCookies(req));
}

function parseCookies(req) {
    var list = {};
    var rc = req.headers.cookie;

    rc && rc.split(';').forEach(function(cookie) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

function getSessionIdFromCookies(req) {
    var cookies = parseCookies(req);
    return cookies['sessid'];
}

exports.login = login;
exports.setUsername = setUsername;
exports.getUsername = getUsername;
exports.getUsernameFromCookies = getUsernameFromCookies;
exports.getSessionIdFromCookies = getSessionIdFromCookies;