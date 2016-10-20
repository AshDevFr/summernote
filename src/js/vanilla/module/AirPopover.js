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

    this.events = {
      'summernote.keyup summernote.mouseup summernote.scroll': function () {
        self.update();
        self.setLastRange();
      },
      'summernote.change summernote.dialog.shown': function () {
        self.update();
        self.setLastRange();
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
      }
    };

    $editable.on('mousedown', function () {
      $document.on('mouseup', function () {
        mouseUp();
      });
      $(window).on('mouseup', function () {
        mouseUp();
      });
      $(window).on('blur', function () {
        mouseUp();
      });

      function mouseUp() {
        self.update();
        self.setLastRange();

        $document.off('mouseup');
        $(window).off('mouseup');
        $(window).off('blur');
      }
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

    this.setLastRange = function () {
      var currentRange = range.createFromSelection();
      if (currentRange && (self.isAncestor(currentRange.sc, editable) || currentRange.sc === editable)) {
        self.lastRange = currentRange ? currentRange : self.lastRange;
      }
      return self.lastRange;
    };

    this.getLastRange = function () {
      return self.lastRange;
    };

    this.insertNode = function (node, rng) {
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);
      rng = rng.deleteContents();
      var info = splitPoint(rng.getStartPoint());

      if (info.rightNode && info.rightNode.parentNode) {
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
        self.lastRange = range.createFromNodeAfter(editable.lastChild || editable.lastElementChild);
        self.lastRange.select();
      }
      return self.lastRange;
    };

    this.pasteHTML = function (markup, rng) {
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);
      rng = rng.deleteContents();
      var info = splitPoint(rng.getStartPoint());

      var contentsContainer = $('<div></div>').html(markup)[0];
      if (contentsContainer && contentsContainer.childNodes) {
        var childNodes = list.from(contentsContainer.childNodes);

        var contents = childNodes.map(function (childNode) {
          if (info.rightNode && info.rightNode.parentNode) {
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

    this.removeFormat = function (rng) {
      removeFormat(rng, function (node) {
        return node && /^BACKQUOTE|^A|^LI|^UL|^EM|^B|^I|^STRONG|^H[1-7]/.test(node.nodeName.toUpperCase());
      });
    };

    this.unquote = function (rng) {
      removeFormat(rng, dom.isBlockquote);
    };

    function removeFormat(rng, pred) {
      if (!pred) {
        return;
      }

      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);

      context.invoke('editor.beforeCommand');

      if (rng.sc !== rng.ec) {
        $.each(list.from(rng.nodes()), removeFormatNode);
      } else {
        removeFormatNode(rng.sc);
      }

      context.invoke('editor.afterCommand');

      function removeFormatNode(idx, rangeNode) {
        var ancestors = dom.listAncestor(rangeNode);
        ancestors.filter(pred).forEach(function (node) {
          var ancestor = node.parentNode;
          if (ancestor) {
            $.each(list.from(node.childNodes), function (idx, child) {
              ancestor.insertBefore(child, node);
            });
            ancestor.removeChild(node);
          }
        });
      }
    }

    function splitPoint(point) {
      if (dom.isEdgePoint(point) && dom.isRightEdgePoint(point)) {
        if (dom.isText(point.node)) {
          return {
            rightNode: point.node.nextSibling,
            container: point.node.parentNode
          };
        }

        return {
          container: point.node
        };
      }

      // split #text
      if (dom.isText(point.node)) {
        return {
          rightNode: point.node.splitText(point.offset),
          container: point.node.parentNode
        };
      } else {
        if (point.offset < point.node.childNodes.length) {
          return {
            rightNode: point.node.childNodes[point.offset],
            container: point.node
          };
        }
        return {
          container: point.node
        };
      }
    }
  };

  return AirPopover;
});
