define([
  'summernote/base/core/func',
  'summernote/base/core/list',
  'summernote/base/core/dom',
  'summernote/base/core/range',
  'summernote/base/core/key'
], function (func, list, dom, range, key) {
  var Hint = function (context) {
    var self = this;

    var hint = context.options.hint || [];
    var hints = $.isArray(hint) ? hint : [hint];

    this.events = {
      'summernote.keyup': function (we, e) {
        if (!e.isDefaultPrevented()) {
          self.handleKeyup(e);
        }
      }
    };

    this.shouldInitialize = function () {
      return hints.length > 0;
    };

    this.initialize = function () {
      this.lastWordRange = null;
    };

    this.replace = function (node) {
      if (node) {
        this.lastWordRange.insertNode(node);
        range.createFromNode(node).collapse().select();

        this.lastWordRange = null;
        context.invoke('editor.focus');
      }

    };
    
    this.searchKeyword = function (index, keyword, callback) {
      var hint = hints[index];
      if (hint && hint.match.test(keyword) && hint.search) {
        var matches = hint.match.exec(keyword);
        hint.search(matches[1], callback);
      } else {
        callback();
      }
    };

    this.getResult = function (idx, keyword, callback) {
      this.searchKeyword(idx, keyword, function (items) {
        items = items || [];
        if (items.length) {
          callback(idx, items);
        }
      });
    };

    this.handleKeyup = function (e) {
      if (!list.contains([key.code.ENTER, key.code.UP, key.code.DOWN], e.keyCode)) {
        var wordRange = context.invoke('editor.createRange').getWordRange();
        var keyword = wordRange.toString();
        if (hints.length && keyword) {
          var bnd = func.rect2bnd(list.last(wordRange.getClientRects()));
          if (bnd) {
            this.lastWordRange = wordRange;

            hints.forEach(function (hint, idx) {
              if (typeof hint.callback === 'function' && hint.match.test(keyword)) {
                self.getResult(idx, keyword, hint.callback);
              }
            });
          }
        }
      }
    };
  };

  return Hint;
});
