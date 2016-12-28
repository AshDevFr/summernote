define([
  'summernote/base/core/func',
  'summernote/base/core/list',
  'summernote/base/core/dom',
  'summernote/base/core/range',
  'summernote/base/core/key'
], function (func, list, dom, range, key) {
  var AutoLink = function (context) {
    var self = this;
    var linkPattern = /^((http|https|ftp|mailto):\/\/([^\s\.\/]+\.){1,2}(\w+)([\w+\/\?\=\%\(\)]*))$/,
        httpPattern = /^(www\.\w+\.[a-z]{2,3}[\w+\/\?\=\%\(\)]*)$/;

    this.events = {
      'summernote.keydown': function (we, e) {
        self.handleKeydown(e);
      }
    };

    this.initialize = function () {
      this.lastWordRange = null;
    };

    this.destroy = function () {
      this.lastWordRange = null;
    };

    this.replace = function () {
      if (!this.lastWordRange) {
        return;
      }

      var anchors = this.lastWordRange.nodes().filter(function (node) {
        return dom.ancestor(node, dom.isAnchor);
      }).length;
      if (anchors) {
        return;
      }

      var keyword = this.lastWordRange.toString(),
          node;

      if (linkPattern.exec(keyword)) {
        node = $('<a />').html(keyword).attr('href', keyword)[0];
      } else if (httpPattern.exec(keyword)) {
        node = $('<a />').html(keyword).attr('href', 'http://' + keyword)[0];
      }

      if (node) {
        this.lastWordRange.insertNode(node);
        range.createFromNode(node).collapse().select();

        this.lastWordRange = null;
        context.invoke('editor.focus');
      }

    };

    this.handleKeydown = function (e) {
      if (list.contains([key.code.ENTER, key.code.SPACE], e.keyCode)) {
        var wordRange = context.invoke('editor.createRange').getWordRange();
        this.lastWordRange = wordRange;
        this.replace();
      }
    };
  };

  return AutoLink;
});
