require('colors');

const g_config = require('./config');
const _        = require('underscore');
const jsdom    = require('jsdom');
const OAuth    = require('oauth').OAuth;

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
                    link: (link.indexOf('http') === 0 ? '' : 'http://www.reddit.com/') + link,
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
                if ((parseInt(point, 10) || 0) > 100 && !stopPush) {
                    data.push({
                        point: pointSpan.html().replace(' points', ''),
                        text:  $(this).html(),
                        link:  $(this).attr('href')
                    });
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
            get('')
        }
    };
})();


/*
getHackerNews(function(err, data) {
    if (err) {
        console.log(err);
        return;
    }
    
    console.log('data getted: ' + (data.length+'').green);
    console.log(data);
});

getReddit({category:'python'}, function(err, data) {
    if (err) {
        console.log(err);
        return;
    }
    
    console.log('data getted: ' + (data.length+'').green);
    var ret = [];
    data.forEach(function(item) {
        var space = item.vote.length === 2 ? '  ' : ' ';
        ret.push('('+item.vote+')' + space + item.text + ' <'+item.link+'>');
    });
    console.log(ret.join('\n'));
});
*/
