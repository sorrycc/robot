require('colors');
const g_config = require('./config');
const _        = require('underscore');
const jsdom    = require('jsdom');
const OAuth    = require('oauth').OAuth;
const exec     = require('child_process').exec;
const fs       = require('fs');
const path     = require('path');
const async    = require('async');
const mail     = require('emailjs');
const linkify  = require('./support/linkify-tweet').RC.linkify;


//////////////////////////////////////////////////////
// Get Functions For Some Sites

var getReddit = function(config, callback, url, page, data) {
    if (_.isFunction(config)) {
        callback = config;
        config   = null;
    }
    config = _.extend({totalPage:4, minVote:20, category:'javascript'}, config);
    url    = url  || 'http://www.reddit.com/r/'+config.category+'/';
    page   = page || 1;
    data   = data || [];
    
    var func = arguments.callee;
    jsdom.env(url, ['./support/jquery-1.5.min.js'], function(err, win) {
        if (err) {
            callback(err);
            return;
        }
        
        var $ = win.jQuery;
    
        $('#siteTable div.thing').each(function() {
            var textEl = $(this).find('div.entry p a.title');
            var text = textEl.html();
            var link = textEl.attr('href');
            var vote = $(this).find('div.midcol > div.unvoted').html();
            if ((parseInt(vote, 10) || 0) > config.minVote) {
                data.push({
                    text: text,
                    link: (link.indexOf('http') === 0 ? '' : 'http://www.reddit.com') + link,
                    vote: vote
                });
            }
        });
    
        if (page >= config.totalPage) {
            data.sort(function(a,b){ return b.vote-a.vote; });
            callback(null, data);
        } else {
            var next = $('p.nextprev a[rel~="next"]').attr('href');
            func(config, callback, next, ++page, data);
        }
    });
};

var getHackerNews = function(config, callback, url, data) {
    if (_.isFunction(config)) {
        callback = config;
        config = null;
    }
    config = _.extend({}, config);
    url    = url  || 'http://news.ycombinator.com/best';
    data   = data || [];
    
    var func = arguments.callee;
    jsdom.env(url, ['./support/jquery-1.5.min.js'], function(err, win) {
        if (err) {
            callback(err);
            return;
        }
        
        var $ = win.jQuery;
        var more;
        var stopPush = false;
        
        $('td.title a').each(function() {
            var pointSpan = $(this).parent().parent().next().find('td.subtext span');
            if (pointSpan[0]) {
                var point = pointSpan.html().replace(' points', '');
                var link = $(this).attr('href');
                if ((parseInt(point, 10) || 0) > 100 && !stopPush) {
                    if (link.indexOf('http') === 0) {
                        data.push({
                            point: pointSpan.html().replace(' points', ''),
                            text:  $(this).html(),
                            link:  link
                        });
                    }
                } else {
                    stopPush = true;
                }
            } else if ($(this).html() === 'More') {
                more = 'http://news.ycombinator.com' + $(this).attr('href');
            }
        });
        
        if (stopPush || !more) {
            callback(null, data);
        } else {
            func(config, callback, more, data);
        }
    });
};

var twitter = (function() {
    var oa = new OAuth(
        'https://twitter.com/oauth/request_token',
        'https://twitter.com/oauth/access_token',
        g_config.twitter.consumer_key,
        g_config.twitter.consumer_secret,
        '1.0', null, 'HMAC-SHA1'
    );
    
    var get = function(api, callback) {
        var token = g_config.twitter.access_token;
        var token_secret = g_config.twitter.access_token_secret;
        if (api.indexOf('http') != 0) {
            api = 'http://api.twitter.com/1' + api;
        }
        oa.get(api, token, token_secret, function(err, data) {
            callback(err, data);
        });
    };
    
    return {
        get: get,
        getList: function(id, callback) {
            id = id || '50273431';
            get('/lists/statuses.json?list_id='+id+'&per_page=200', callback);
        },
        getFavorites: function(callback) {
            get('/favorites.json?count=100', callback);
        }
    };
})();


//////////////////////////////////////////////////////
// Run

var parseResults = function(err, results) {
    if (err) {
        console.log('err'.bold.red);
        console.log(err);
        return;
    }
    
    var html = [];
    var redditData = [];
    var hackerNewsData = [];
    var twitterData = [];
    
    if (results[0] && _.isArray(results[0])) {
        html.push('<h2>Reddit</h2>');
        results[0].forEach(function(item) {
            if (data['reddit'][item.link]) return;
            var space = item.vote.length === 2 ? '  ' : ' ';
            html.push('('+item.vote+')' + space + '<a href="'+item.link+'">'+item.text+'</a><br>');
            redditData.push(item.link);
        });
    }
    
    if (results[1] && _.isArray(results[1])) {
        html.push('<h2>HackerNews</h2>');
        results[1].forEach(function(item) {
            if (data['hackernews'][item.link]) return;
            var space = item.point.length === 2 ? '  ' : ' ';
            html.push('('+item.point+')' + space + '<a href="'+item.link+'">'+item.text+'</a><br>');
            hackerNewsData.push(item.link);
        });
    }
    
    if (results[2] && _.isString(results[2])) {
        html.push('<h2>Twitter Favorites</h2>');
        JSON.parse(results[2]).forEach(function(item) {
            if (data['twitter'][item.id]) return;
            html.push(item.create_at + ' ' + item.user.name + ' : ' + linkify(item.text));
            twitterData.push(item.id);
        });
    }
    
    if (results[3] && _.isString(results[3])) {
        html.push('<h2>Twitter List</h2>');
        JSON.parse(results[3]).forEach(function(item) {
            if (data['twitter'][item.id]) return;
            html.push(item.create_at + ' ' + item.user.name + ' : ' + linkify(item.text));
            twitterData.push(item.id);
        });
    }
    
    writeFileAppend('./data/reddit',     redditData.join('\n'));
    writeFileAppend('./data/hackernews', hackerNewsData.join('\n'));
    writeFileAppend('./data/twitter',    twitterData.join('\n'));
    
    console.log(html.join('\n'));
    sendMail(html.join(''));
};

var sendMail = function(html) {
    var server = mail.server.connect(g_config.mail.server);
    var message = mail.message.create({
                text:    'weekly report text',
                from:    g_config.mail.from,
                to:      g_config.mail.to,
                subject: g_config.mail.subject + ' @ ' + new Date()
            });
    message.attach_alternative(html);
    server.send(message, function(err, message) {
        console.log(err || 'mail sent'.bold.green);
    });
};

var writeFileAppend = function(path, data) {
    var file = fs.createWriteStream(path, {flags:'a'});
    file.write(data);
};

var doGet = function() {
    async.series([
            async.apply(getReddit, {totalPage:1})
          , async.apply(getHackerNews)
          , async.apply(twitter.getFavorites)
          , async.apply(twitter.getList, '50273431')
        ], parseResults);
};

var data = {reddit:{}, hackernews:{}, twitter:{}};
if (!path.existsSync('./data')) {
    async.series([
            async.apply(exec, 'mkdir ./data'),
            async.apply(exec, 'touch ./data/hackernews'),
            async.apply(exec, 'touch ./data/reddit'),
            async.apply(exec, 'touch ./data/twitter')
        ], function(err, data) {
            doGet();
        });
} else {
    ['reddit', 'hackernews', 'twitter'].forEach(function(key) {
        fs.readFileSync('./data/'+key, 'utf8').split('\n').forEach(function(d) {
            data[key][d] = 1;
        });
    });
    doGet();
}

