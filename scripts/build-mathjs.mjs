// Regenerate the minified mathjs bundle the browser loads (js/lib/math.bundle.min.js)
// from the `mathjs` package in node_modules. The version is the `mathjs`
// devDependency in package.json — there is no other pin and no wrapper file.
//
//   npm run build:mathjs
//
// Run `npm run build:sw-manifest` afterwards: the bundle is precached.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

await build({
  // The entry is virtual: only the two names the app uses, resolved from npm.
  stdin: {
    contents: "export { create, all } from 'mathjs';",
    resolveDir: root,
    sourcefile: 'mathjs-entry.js',
  },
  outfile: `${root}js/lib/math.bundle.min.js`,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
  logLevel: 'warning',
});
console.log('js/lib/math.bundle.min.js');
