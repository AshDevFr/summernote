define([
  'summernote/base/renderer'
], function (renderer) {
  var ui = {
    editor: renderer.create('<div class="note-editor note-frame">'),
    toolbar: renderer.create('<div class="note-toolbar">'),
    editingArea: renderer.create('<div class="note-editing-area">'),
    codable: renderer.create('<textarea class="note-codable">'),
    editable: renderer.create('<div class="note-editable" contentEditable="true">'),
    buttonGroup: renderer.create('<span class="note-btn-group">'),
    button: renderer.create('<button class="note-btn">'),
    airEditor: renderer.create('<div class="note-editor"/>'),
    airEditable: renderer.create('<div class="note-editable" contentEditable="true"/>'),
    statusbar: renderer.create([
      '<div class="note-statusbar">',
      '  <div class="note-resizebar">',
      '    <div class="note-icon-bar"/>',
      '    <div class="note-icon-bar"/>',
      '    <div class="note-icon-bar"/>',
      '  </div>',
      '</div>'
    ].join('')),

    createLayout: function ($note, options) {
      var $editor = (options.airMode ? ui.airEditor([
        ui.editingArea([
          ui.airEditable()
        ])
      ]) : ui.editor([
        ui.toolbar(),
        ui.editingArea([
          ui.codable(),
          ui.editable()
        ]),
        ui.statusbar()
      ])).render();

      $editor.insertAfter($note);

      return {
        note: $note,
        editor: $editor,
        toolbar: $editor.find('.note-toolbar'),
        editingArea: $editor.find('.note-editing-area'),
        editable: $editor.find('.note-editable'),
        codable: $editor.find('.note-codable'),
        statusbar: $editor.find('.note-statusbar')
      };
    },

    removeLayout: function ($note, layoutInfo) {
      $note.html(layoutInfo.editable.html());
      layoutInfo.editor.remove();
      $note.show();
    }
  };

  return ui;
});
