define([
  'summernote/base/core/agent',
  'summernote/base/core/func',
  'summernote/base/core/list',
  'summernote/base/core/range'
], function (agent, func, list, range) {
  var AirPopover = function (context) {
    var self = this;

    var $editable = context.layoutInfo.editable;
    var editable = $editable[0];

    var options = context.options;

    this.events = {
      'summernote.keyup summernote.mouseup summernote.scroll': function () {
        self.update();
      },
      'summernote.change summernote.dialog.shown': function () {
        self.update();
      },
      'summernote.focusout': function (we, e) {
        // [workaround] Firefox doesn't support relatedTarget on focusout
        //  - Ignore hide action on focus out in FF.
        if (agent.isFF) {
          return;
        }

        if (!e.relatedTarget) {
          self.hide();
        }

        self.lastRange = range.createFromSelection();
      }
    };

    this.shouldInitialize = function () {
      return options.airMode &&
        options.popover &&
        options.popover.air &&
        typeof options.popover.air.hide === 'function' &&
        typeof options.popover.air.update === 'function';
    };

    this.initialize = function () {
      this.fontInstalledMap = {};
    };

    this.destroy = function () {
      delete this.fontInstalledMap;
    };

    this.isFontInstalled = function (name) {
      if (!self.fontInstalledMap.hasOwnProperty(name)) {
        self.fontInstalledMap[name] = agent.isFontInstalled(name) ||
          list.contains(options.fontNamesIgnoreCheck, name);
      }

      return self.fontInstalledMap[name];
    };

    this.getAvailablesFont = function () {
      return options.fontNames.filter(self.isFontInstalled);
    };

    this.getLastRange = function () {
      return self.lastRange;
    };

    this.insertNode = function (node, rng) {
      if (!$editable.is(':focus')) {
        $editable.focus();
        rng = rng || self.lastRange || range.create(editable);
        rng.insertNode(node);
        self.lastRange = range.createFromNodeAfter(node);
        self.lastRange.select();
      } else {
        context.invoke('editor.insertNode', node);
      }
    };

    this.update = function (force) {
      var styleInfo = context.invoke('editor.currentStyle');
      if (styleInfo.range && (!styleInfo.range.isCollapsed() || force)) {
        var rect = list.last(styleInfo.range.getClientRects());
        var bnd;
        if (rect) {
          bnd = func.rect2bnd(rect);
          options.popover.air.update(styleInfo, bnd);
        } else if (force) {
          options.popover.air.update(styleInfo, null);
        }
      } else {
        this.hide();
      }
    };

    this.hide = function () {
      options.popover.air.hide();
    };
  };

  return AirPopover;
});
