# Math Notes
Inline calculator to run on browser.

## Dependencies
Created using ECMAScript, and [math.js](https://mathjs.org/).

## ECMAScript features
- Modules;
- Descructuring;
- Arrow Functions;
- let, const;
- Listener for input;
- async, await;

If your browser doesn't support these features, the calculator will not work.

---

## Development

There is no runtime build step: the app runs as plain ES modules. Only the
math.js dependency is pre-bundled and committed in `js/lib/`.

### Updating math.js

The pinned version lives in two places, keep them in sync:
- the import in `js/lib/math.js`
- the `mathjs` devDependency in `package.json`

Regenerate the bundle, then minify it into the file the app loads:

```sh
deno bundle js/lib/math.js js/lib/math.bundle.js
# minify the result to js/lib/math.bundle.min.js (e.g. with terser)
```

### Tests

The calculation pipeline is pure and covered by the Node test runner:

```sh
npm test
```

---

Project based on [Numi](https://numi.app/) app for MacOS.
