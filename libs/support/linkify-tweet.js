/**
 * Generates an HTML-formatted string from a text twitter
 * message, sanitized and autolinked for mentions, urls and
 * hash tags with useful classes. Example:
 *
 *   console.log(RC.linkify('@rcanine check out nfl.com/news #nflrocks'));
 *
 * Should log:
 *
 * <span class="twitter-linkfy">
 *   <a class="mention" href="http://twitter.com/#!/rcanine" target="_blank">rcanine</a> check out
 *   <a href="http://nfl.com/news" target="_blank">nfl.com/news</a>
 *   <a class="tag" href="http://twitter.com/#!/search?q=%23nflrocks" target="_blank">#nflrocks</a>
 * </span>
 */
(function (exports) {
  var GRUBERS_URL_RE    = /\b((?:[a-z][\w\-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i,
      HAS_PROTOCOL      = /^[a-z][\w\-]+:/,
      MENTION_FIND      = /@([^\W]*)/g,
      MENTION_REPLACE   = '<a class="mention" href="http://twitter.com/#!/$1" target="_blank">@$1</a>',
      TAG_FIND          = /#([^\W]*)/g,
      TAG_REPLACE       = '<a class="tag" href="http://twitter.com/#!/search?q=%23$1" target="_blank">#$1</a>';
  
  function escapeHTML(text) {
    return text.replace(/</g, '&lt;');
  }

  function linkifyWord(word, index, array) {
    var m, result, url, escapedURL, text;

    if (MENTION_FIND.test(word)) {
      result = word.replace(MENTION_FIND, MENTION_REPLACE);
    }
    else if (TAG_FIND.test(word)) {
      result = word.replace(TAG_FIND, TAG_REPLACE);
    }
    else {
      result = escapeHTML(word);
      m = word.match(GRUBERS_URL_RE);
      result = escapeHTML(word);

      if (m) {
        text = escapeHTML(m[1]);
        url = HAS_PROTOCOL.test(text) ? text : 'http://' + text;
        result = result.replace(text, '<a href="' + url + '" target="_blank">' + text + '</a>');
      }
    }
    return result;
  }

  function linkify(text) {
    var aText = text.split(/\s+/), i, l;
    for (i = 0, l = aText.length; i < l; i += 1) {
      aText[i] = linkifyWord(aText[i]);
    }
    return '<span class="twitter-linkify">' + aText.join(' ') + '</span>';
  }
  
  exports.RC = exports.RC || {};
  exports.RC.linkify = linkify;
}(typeof window !== 'undefined' ? window : module.exports));
