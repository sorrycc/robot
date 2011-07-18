require('colors');
const OAuth = require('oauth').OAuth;

var oa = new OAuth(
        'https://twitter.com/oauth/request_token',
        'https://twitter.com/oauth/access_token',
        'R0deKuaE9nbvl22i7Qq8bw',
        'wmvvw0b8bNqqME6OZqhEq9QIMrUjRDbfKgAZrD5ALo',
        '1.0', null, 'HMAC-SHA1'
    );
    
var get = function(api, callback) {
    var token = '15205852-BYhywRfn2j0KeLgyHG0Lsxck4yXRUPDOjtTx3Y';
    var token_secret = 'GLwrGTs983RBiOEM7XTVCp5XEMogZ7x6EaHf8IU3B34';
    if (api.indexOf('http') != 0) {
        api = 'http://api.twitter.com/1' + api;
    }
    oa.get(api, token, token_secret, function(err, data) {
        callback(err, data);
    });
};

get('/lists/statuses.json?list_id=50273431&per_page=200', function(err, data) {
    if (err) {
        console.log('err'.bold.red);
        console.log(err);
        return;
    }
    
    data = JSON.parse(data);
    data.forEach(function(item) {
        console.log(item.user.name + ' : ' + item.text + '('+item.created_at+')');
    });
});
