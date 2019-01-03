var pam = require('authenticate-pam');

function login(user, pass, callback) {
    pam.authenticate(user, pass, function(err) {
        if(err) {
            console.log(err);
            callback(false);
        } else {
            callback(true);
        }
    }, {serviceName: 'processmanager'});
}

exports.login = login;