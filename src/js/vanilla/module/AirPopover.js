define([
  'summernote/base/core/agent',
  'summernote/base/core/dom',
  'summernote/base/core/func',
  'summernote/base/core/list',
  'summernote/base/core/range'
], function (agent, dom, func, list, range) {
  var AirPopover = function (context) {
    var self = this;

    var $document = $(document);
    var $editable = context.layoutInfo.editable;
    var editable = $editable[0];

    var options = context.options;

    var innerMouseUp;

    this.events = {
      'summernote.keyup summernote.mouseup summernote.scroll': function () {
        innerMouseUp = true;
        self.update();
      },
      'summernote.change summernote.dialog.shown': function () {
        self.update();
      },
      'summernote.focusout': function (we, e) {
        var currentRange = range.createFromSelection();
        self.lastRange = currentRange ? currentRange : self.lastRange;

        // [workaround] Firefox doesn't support relatedTarget on focusout
        //  - Ignore hide action on focus out in FF.
        if (agent.isFF) {
          return;
        }

        if (!e.relatedTarget) {
          self.hide();
        }
      }
    };

    $editable.on('mousedown', function () {
      $document.on('mouseup', function () {
        if (!innerMouseUp) {
          self.update();
        }

        innerMouseUp = false;
        $document.off('mouseup');
      });
    });

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

    this.insertNode = function (node, rng, forceInline) {
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);
      var info = dom.splitPoint(rng.getStartPoint(), forceInline || dom.isInline(node));

      if (info.rightNode) {
        info.rightNode.parentNode.insertBefore(node, info.rightNode);
      } else {
        if (!info.container || !self.isAncestor(info.container, editable)) {
          editable.appendChild(node);
        } else {
          info.container.appendChild(node);
        }
      }

      self.lastRange = range.createFromNodeAfter(node);
      self.lastRange.select();
    };

    this.moveCursorToEnd = function () {
      if (editable.lastChild || editable.lastElementChild) {
        range.createFromNodeAfter(editable.lastChild || editable.lastElementChild).select();
      }
    };

    this.pasteHTML = function (markup, rng) {
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);
      var info = dom.splitPoint(rng.getStartPoint(), false);

      var contentsContainer = $('<div></div>').html(markup)[0];
      if (contentsContainer && contentsContainer.childNodes) {
        var childNodes = list.from(contentsContainer.childNodes);

        var contents = childNodes.map(function (childNode) {
          if (info.rightNode) {
            info.rightNode.parentNode.insertBefore(childNode, info.rightNode);
          } else {
            if (!info.container || !self.isAncestor(info.container, editable)) {
              editable.appendChild(childNode);
            } else {
              info.container.appendChild(childNode);
            }
          }
          return childNode;
        });

        self.lastRange = range.createFromNodeAfter(list.last(contents));
        self.lastRange.select();
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

    this.isAncestor = function (node, parentNode) {
      while (node) {
        if (node === parentNode) { return true; }

        node = node.parentNode;
      }
      return null;
    };
  };

  return AirPopover;
});
