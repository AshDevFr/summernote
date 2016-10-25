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

    this.insertNode = function (node, rng, deep) {
      context.invoke('editor.beforeCommand');
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);
      rng = rng.deleteContents();
      var splitFn = deep ? splitPointDeep : splitPoint,
          info = splitFn(rng.getStartPoint());

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
      context.invoke('editor.afterCommand');
    };

    this.moveCursorToEnd = function () {
      context.invoke('editor.beforeCommand');
      if (editable.lastChild || editable.lastElementChild) {
        self.lastRange = range.createFromNodeAfter(editable.lastChild || editable.lastElementChild);
        self.lastRange.select();
      }
      context.invoke('editor.afterCommand');
      return self.lastRange;
    };

    this.pasteHTML = function (markup, rng, deep) {
      context.invoke('editor.beforeCommand');
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);
      rng = rng.deleteContents();
      var splitFn = deep ? splitPointDeep : splitPoint,
          info = splitFn(rng.getStartPoint());

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
      context.invoke('editor.afterCommand');
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
      rng = self.getFullParaRange(rng);
      rng = self.createPara(rng);
      removeFormat(rng, dom.isBlockquote);
    };

    this.splitPara = function (rng) {
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);

      context.invoke('editor.beforeCommand');

      splitPointDeep(rng.getStartPoint());

      context.invoke('editor.afterCommand');
    };

    this.createPara = function (rng) {
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);

      var info = {},
          leftPoint, startPoint, endPoint,
          leftRange, rightRange;
      if (rng.sc === rng.ec && rng.so === rng.eo) {
        info.left = splitPointDeep(rng.getStartPoint());
      } else {
        startPoint = rng.getStartPoint();
        endPoint = rng.getEndPoint();
        if (startPoint.node === endPoint.node) {
          endPoint.offset -= startPoint.offset;
        }
        info.left = splitPointDeep(startPoint);
        if (info.left.rightNode) {
          leftRange = range.createFromNodeBefore(info.left.rightNode);
          leftPoint = dom.prevPoint(leftRange.getStartPoint());
          if (leftPoint) {
            leftRange = range.create(leftPoint.node, leftPoint.offset, leftPoint.node, leftPoint.offset);
          }
        }
        info.right = splitPointDeep(endPoint);
      }

      if (info.right) {
        if (info.right.rightNode) {
          rightRange = range.createFromNodeBefore(info.right.rightNode);
          leftPoint = dom.prevPointUntil(rightRange.getStartPoint(), dom.isVisiblePoint);
          if (leftPoint) {
            rightRange = range.create(leftPoint.node, leftPoint.offset, leftPoint.node, leftPoint.offset);
          }
        } else {
          rightRange = self.moveCursorToEnd();
        }
      } else if (!leftRange) {
        leftRange = self.moveCursorToEnd();
      }

      if (rightRange) {
        startPoint = leftRange.getStartPoint();
        endPoint = rightRange.getStartPoint();
        rng = range.create(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);
      } else {
        startPoint = leftRange.getStartPoint();
        rng = range.create(startPoint.node, startPoint.offset, startPoint.node, startPoint.offset);
      }

      self.lastRange = rng;
      self.lastRange.select();

      return self.lastRange;
    };

    this.getFullParaRange = function (rng) {
      rng = rng || self.lastRange || range.create(editable);
      if (!rng) {
        return null;
      }

      var startPoint = rng.getStartPoint(),
          endPoint = rng.getEndPoint(),
          leftPoint = getStartLinePoint(startPoint),
          rightPoint = getEndLinePoint(endPoint);

      if (leftPoint && !dom.isSamePoint(leftPoint, startPoint)) {
        startPoint = leftPoint;
      }

      if (rightPoint && !dom.isSamePoint(rightPoint, endPoint)) {
        endPoint = rightPoint;
      }

      return range.create(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);

      function getStartLinePoint(point) {
        return dom.prevPointUntil(point, function (newPoint) {
          var prevPoint = dom.prevPoint(newPoint);
          return (dom.isLeftEdgePoint(newPoint) && (dom.isPara(newPoint.node) || dom.isBlockquote(newPoint.node))) ||
            (prevPoint.node && /^BR|^HR|^IFRAME/.test(prevPoint.node.nodeName.toUpperCase()));
        });
      }

      function getEndLinePoint(point) {
        return dom.nextPointUntil(point, function (newPoint) {
          return (dom.isRightEdgePoint(newPoint) && (dom.isPara(newPoint.node) || dom.isBlockquote(newPoint.node))) ||
            (newPoint.node && /^BR|^HR|^IFRAME/.test(newPoint.node.nodeName.toUpperCase()));
        });
      }
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

    function splitPointDeep(point) {
      var leftPoint = dom.prevPointUntil(point, function (newPoint) {
        return !dom.isLeftEdgePoint(newPoint) || (dom.isLeftEdgePoint(newPoint) && newPoint.node === editable);
      });
      var rightPoint = dom.nextPointUntil(point, function (newPoint) {
        return !dom.isRightEdgePoint(newPoint) || (dom.isRightEdgePoint(newPoint) && newPoint.node === editable);
      });

      if (leftPoint && !dom.isSamePoint(leftPoint, point)) {
        point = leftPoint;
      } else if (rightPoint && !dom.isSamePoint(rightPoint, point)) {
        point = rightPoint;
      }

      var brNode;
      leftPoint = dom.prevPoint(point);
      rightPoint = dom.nextPoint(point);

      if (leftPoint && dom.isBR(leftPoint.node)) {
        brNode = leftPoint.node;
        leftPoint = dom.prevPoint(leftPoint);
        brNode.parentNode.removeChild(brNode);
        if (leftPoint) {
          point = leftPoint;
        }
      } else if (rightPoint && dom.isBR(rightPoint.node)) {
        brNode = rightPoint.node;
        rightPoint = dom.prevPoint(rightPoint);
        brNode.parentNode.removeChild(brNode);
        if (rightPoint) {
          point = rightPoint;
        }
      }

      var leftRng = range.create(editable, 0, point.node, point.offset),
          leftContent = leftRng.nativeRange().extractContents(),
          rightNode;

      if (list.from(editable.childNodes).length) {
        rightNode = editable.childNodes[0];
        editable.insertBefore(leftContent, rightNode);
      } else {
        editable.appendChild(leftContent);
      }

      return {
        container: editable,
        rightNode: rightNode
      };
    }
  };

  return AirPopover;
});
