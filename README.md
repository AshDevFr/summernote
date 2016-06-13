# Winternote

Based on Summernote  
Super simple WYSIWYG Editor.

[![Build Status](https://secure.travis-ci.org/AshDevFr/winternote.svg)](http://travis-ci.org/AshDevFr/winternote)
[![npm version](https://badge.fury.io/js/winternote.svg)](http://badge.fury.io/js/winternote)
[![Coverage Status](https://coveralls.io/repos/AshDevFr/winternote/badge.svg?branch=develop&service=github)](https://coveralls.io/github/AshDevFr/winternote?branch=develop)


### Winternote
Winternote is a JavaScript library that helps you create WYSIWYG editors online.

Home page: <http://summernote.org>

### Why Winternote?

Winternote has a few special features:

* Paste images from clipboard
* Saves images directly in the content of the field using base64 encoding, so you don't need to implement image handling at all
* Simple UI
* Interactive WYSIWYG editing
* Handy integration with server

### Installation and dependencies

Winternote uses opensource libraries: [jQuery](http://jquery.com/).

#### 1. include JS/CSS

Include the following code in the `<head>` tag of your HTML:

```html
<!-- include libraries(jQuery, bootstrap) -->
<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script> 

<!-- include summernote css/js-->
<link href="summernote.css" rel="stylesheet">
<script src="summernote.js"></script>
```

#### 2. target a element

Then place a `div` tag somewhere in the `body` tag. This element will be replaced with the summernote editor.

```html
<div id="summernote">Hello Summernote</div>
```

#### 3. summernote

Finally, run this script after the DOM is ready:

```javascript
$(document).ready(function() {
  $('#summernote').summernote();
});
```

For more examples, please visit to [homepage](http://summernote.org/examples).

### API

`code` - get the HTML source code underlying the text in the editor:

```javascript
var html = $('#summernote').summernote('code');
```

For more detail about API, please refer to [document](http://summernote.org/getting-started/#basic-api).

#### Warning - code injection

The code view allows the user to enter script contents. Make sure to filter/[sanitize the HTML on the server](https://github.com/search?l=JavaScript&q=sanitize+html). Otherwise, an attacker can inject arbitrary JavaScript code into clients.

#### document structure

```
 - body container: <div class="note-editable">, <td>, <blockquote>, <ul>
 - block node: <div>, <p>, <li>, <h1>, <table>
 - void block node: <hr>
 - inline node: <span>, <b>, <font>, <a>, ...
 - void inline node: <img>
 - text node: #text
```

1. A body container has block node, but `<ul>` has only `<li>` nodes.
2. A body container also has inline nodes sometimes. This inline nodes will be wraped with `<p>` when enter key pressed.
4. A block node only has inline nodes.
5. A inline nodes has another inline nodes
6. `#text` and void inline node doesn't have children.

#### build summernote
```bash
# grunt-cli is need by grunt; you might have this installed already
npm install -g grunt-cli
npm install

# generate minified copy: dist/summernote.min.js, dist/summernote.css
grunt dist
```
At this point, you should now have a `build/` directory populated with everything you need to use summernote.

#### test summernote
run tests with Karma and PhantomJS
```bash
grunt test
```
If you want run tests on other browser,
change the values for `broswers` properties in `Gruntfile.js`.

```
karma: {
  all: {
    browsers: ['PhantomJS'],
    reporters: ['progress']
  }
}

```
You can use `Chrome`, `ChromeCanary`, `Firefox`, `Opera`, `Safari`, `PhantomJS` and `IE` beside `PhantomJS`.
Once you run `grunt test`, it will watch all javascript file. Therefore karma run tests every time you chage code.

#### start local server for developing summernote.
run local server with connect and watch.
```bash
grunt server
# Open a browser on http://localhost:3000.
# If you change source code, automatically reload your page.
```

#### Coding convention
* JSHint: http://www.jshint.com/about/
* JSHint rule: https://github.com/AshDevFr/winternote/blob/master/.jshintrc

#### Contribution guide
* Please read [CONTRIBUTING.md](https://github.com/AshDevFr/winternote/blob/develop/CONTRIBUTING.md) before sending pull requests.

### Contacts
* Email: susukang98@gmail.com
* Twitter: http://twitter.com/hackerwins
* Chat with us:
[![Join the chat at https://gitter.im/AshDevFr/winternote](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/AshDevFr/winternote?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

### License
summernote may be freely distributed under the MIT license.
