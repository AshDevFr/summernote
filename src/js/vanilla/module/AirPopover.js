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

    this.insertOrderedList = function (rng) {
      self.toggleList(rng, 'insertOrderedList');
    };

    this.insertUnorderedList = function (rng) {
      self.toggleList(rng, 'insertUnorderedList');
    };

    this.toggleList = function (rng, command) {
      if (!command) {
        return;
      }
      rng = self.getFullParaRange(rng);
      rng = self.createPara(rng);
      rng = unWrapBR(rng);
      rng = normalizePara(rng);
      rng.select();
      context.invoke('editor.' + command);
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
            (prevPoint && prevPoint.node && /^BR|^HR|^IFRAME/.test(prevPoint.node.nodeName.toUpperCase()));
        });
      }

      function getEndLinePoint(point) {
        return dom.nextPointUntil(point, function (newPoint) {
          return (dom.isRightEdgePoint(newPoint) && (dom.isPara(newPoint.node) || dom.isBlockquote(newPoint.node))) ||
            (newPoint.node && /^BR|^HR|^IFRAME/.test(newPoint.node.nodeName.toUpperCase()));
        });
      }
    };

    function normalizePara(rng) {
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);
      var rngSave = saveRng(rng);

      var nodes = rng.nodes().filter(function (node) {
        if (node.parentNode && node.parentNode.childNodes && dom.position(node) > 0) {
          return isWrappable(node) && !isWrappable(node.parentNode.childNodes[dom.position(node) - 1]);
        } else {
          return isWrappable(node);
        }
      });

      if (nodes.length) {
        nodes.forEach(function (node) {
          var nodeList = [],
              parentNode = node.parentNode,
              childNodes = list.from(parentNode.childNodes),
              isBreak = false,
              position = {container: parentNode},
              i;

          for (i = dom.position(node); i < childNodes.length; i++) {
            var child = childNodes[i];
            if (!isBreak && isWrappable(child)) {
              nodeList.push(child);
            } else if (!isBreak) {
              isBreak = true;
              position.rightNode = child;
            }
          }

          if (isBreak && !dom.position(node) || dom.position(node)) {
            wrapNodes(nodeList, position, rngSave);
          }
        });
      }

      return restoreRng(rngSave);

      function isWrappable(node) {
        return !isPara(node) &&
          !isVoid(node) &&
          node.parentNode &&
          (isPara(node.parentNode) || dom.isEditable(node.parentNode));
      }

      function wrapNodes(nodes, position, rngSave) {
        if (!nodes.length) {
          return;
        }

        var node = document.createElement('div');

        nodes.forEach(function (child, index) {
          if (child.parentNode === rngSave.nextPoint.node && dom.position(child) < rngSave.nextPoint.offset) {
            rngSave.nextPoint.offset -= 1;
          } else if (child.parentNode === rngSave.nextPoint.node && dom.position(child) === rngSave.nextPoint.offset) {
            rngSave.nextPoint = {
              node: node,
              offset: index
            };
          }
          node.appendChild(child);
        });

        if (position.rightNode && position.rightNode.parentNode) {
          if (position.rightNode.parentNode === rngSave.nextPoint.node && dom.position(position.rightNode) < rngSave.nextPoint.offset) {
            rngSave.nextPoint.offset += 1;
          }
          position.rightNode.parentNode.insertBefore(node, position.rightNode);
          if (dom.isBR(position.rightNode)) {
            if (position.rightNode.parentNode === rngSave.nextPoint.node && dom.position(position.rightNode) < rngSave.nextPoint.offset) {
              rngSave.nextPoint.offset -= 1;
            }
            position.rightNode.parentNode.removeChild(position.rightNode);
          }
        } else {
          if (!position.container || !self.isAncestor(position.container, editable)) {
            if (editable === rngSave.nextPoint.node &&
              rngSave.nextPoint.offset === editable.childNodes.length) {
              rngSave.nextPoint.offset += 1;
            }
            editable.appendChild(node);
          } else {
            if (position.container === rngSave.nextPoint.node &&
              rngSave.nextPoint.offset === position.container.childNodes.length) {
              rngSave.nextPoint.offset += 1;
            }
            position.container.appendChild(node);
          }
        }

        return node;
      }
    }

    function unWrapBR(rng) {
      if (!$editable.is(':focus')) {
        $editable.focus();
      }
      rng = rng || self.lastRange || range.create(editable);
      var rngSave = saveRng(rng);

      var nodes = rng.nodes().filter(function (node) {
        var point = {
          node: node.parentNode,
          offset: dom.position(node)
        };
        return dom.isBR(node) && !isPara(node.parentNode) && (!dom.isLeftEdgePoint(point) || !dom.isRightEdgePoint(point));
      });

      if (!nodes || !nodes.length) {
        return rng;
      }

      return processBRNodes(nodes);

      function processBRNodes(nodes) {
        nodes.forEach(function (node) {
          var parentPoint = {
            node: node.parentNode,
            offset: dom.position(node)
          };
          var point = {
            node: node,
            offset: 0
          };

          if (dom.isLeftEdgePoint(parentPoint) && !dom.isRightEdgePoint(parentPoint) && !dom.isEditable(parentPoint.node)) {
            parentPoint.node.parentNode.insertBefore(node, parentPoint.node);
          } else if (dom.isRightEdgePoint(parentPoint) && !dom.isLeftEdgePoint(parentPoint) && !dom.isEditable(parentPoint.node)) {
            var parentParentPoint = {
              node: parentPoint.node.parentNode,
              offset: dom.position(parentPoint.node)
            };
            if (dom.isRightEdgePoint(parentParentPoint)) {
              if (parentParentPoint.node === rngSave.nextPoint.node &&
                rngSave.nextPoint.offset === parentParentPoint.node.childNodes.length) {
                rngSave.nextPoint.offset += 1;
              }
              parentParentPoint.node.appendChild(node);
            } else {
              var rightNode = parentParentPoint.node.childNodes[dom.position(parentPoint.node) + 1];
              if (parentParentPoint.node === rngSave.nextPoint.node &&
                rngSave.nextPoint.offset >= dom.position(rightNode)) {
                rngSave.nextPoint.offset += 1;
              }
              parentParentPoint.node.insertBefore(node, rightNode);
            }
          } else {
            var prevPoint = dom.prevPoint(point);
            if (prevPoint) {
              var parentNode = prevPoint.node.parentNode;
              if (parentNode === rngSave.nextPoint.node &&
                rngSave.nextPoint.offset >= dom.position(prevPoint.node)) {
                rngSave.nextPoint.offset += 1;
              }
              var info = splitNode(prevPoint);
              if (info.rightNode && info.rightNode.parentNode) {
                if (info.rightNode.parentNode === rngSave.nextPoint.node &&
                  rngSave.nextPoint.offset >= dom.position(info.rightNode)) {
                  rngSave.nextPoint.offset += 1;
                }
                info.rightNode.parentNode.insertBefore(node, info.rightNode);
              }
            }
          }
        });

        var rng = restoreRng(rngSave);

        nodes = rng.nodes().filter(function (node) {
          var point = {
            node: node.parentNode,
            offset: dom.position(node)
          };
          return dom.isBR(node) && !isPara(node.parentNode) && (!dom.isLeftEdgePoint(point) || !dom.isRightEdgePoint(point));
        });

        if (nodes && nodes.length) {
          return processBRNodes(nodes);
        }
        return rng;
      }
    }

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

    function splitNode(point) {
      var leftRange = range.create(editable).nativeRange();
      leftRange.setStart(point.node.parentNode, dom.position(point.node));
      leftRange.setEnd(point.node, point.offset);
      var leftContent = leftRange.extractContents();
      var rightNode;

      if (list.from(point.node.parentNode.childNodes).length) {
        rightNode = point.node;
        point.node.parentNode.insertBefore(leftContent, rightNode);
      } else {
        point.node.parentNode.appendChild(leftContent);
      }

      return {
        container: point.node.parentNode,
        rightNode: rightNode
      };
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

    function isVoid(node) {
      return node && node.nodeName && /^BR|^HR|^IFRAME/.test(node.nodeName.toUpperCase());
    }

    function isPara(node) {
      return dom.isPara(node) || dom.isBlockquote(node);
    }

    function saveRng(rng) {
      return {
        prevPoint: dom.prevPoint(rng.getStartPoint()),
        nextPoint: dom.nextPoint(rng.getEndPoint())
      };
    }

    function restoreRng(save) {
      var startPoint = save.prevPoint ?
      dom.nextPoint(save.prevPoint) || {node: editable, offset: 0} :
      {node: editable, offset: 0};
      var endPoint = save.nextPoint ?
      dom.prevPoint(save.nextPoint) || {node: editable, offset: editable.childNodes.length} :
      {node: editable, offset: editable.childNodes.length};

      return range.create(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);
    }
  };

  return AirPopover;
});
