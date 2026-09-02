// Regression guard for the crawler- and share-facing metadata. Pure Node: no
// browser, no network. It parses index.html with regexes rather than a DOM
// because the file is hand-formatted and excluded from prettier — the point is
// to notice when a tag is dropped, not to validate HTML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file) => readFileSync(join(root, file), 'utf8');

const ORIGIN = 'https://imaginamundo.github.io/math-notes/';

const html = read('index.html');
const manifest = JSON.parse(read('manifest.json'));

function metaContent(attribute, name) {
  const pattern = new RegExp(
    `<meta[^>]*\\b${attribute}=["']${name}["'][^>]*\\bcontent=["']([^"']*)["']`,
    'i'
  );
  const match = html.match(pattern);
  return match ? match[1] : null;
}

const ogTag = (name) => metaContent('property', name);
const nameTag = (name) => metaContent('name', name);

function linkHref(rel) {
  const pattern = new RegExp(`<link[^>]*\\brel=["']${rel}["'][^>]*\\bhref=["']([^"']*)["']`, 'i');
  const match = html.match(pattern);
  return match ? match[1] : null;
}

test('index.html declares a title, description and canonical URL', () => {
  const title = html.match(/<title>([^<]*)<\/title>/);
  assert.ok(title, 'no <title>');
  assert.ok(title[1].trim().length > 10, 'title has no keyword tail');
  assert.ok(nameTag('description'), 'no meta description');
  assert.equal(linkHref('canonical'), ORIGIN);
  assert.equal(nameTag('robots'), 'index, follow');
});

test('index.html declares a complete Open Graph card', () => {
  for (const tag of [
    'og:type',
    'og:site_name',
    'og:title',
    'og:description',
    'og:url',
    'og:locale',
    'og:image',
    'og:image:type',
    'og:image:width',
    'og:image:height',
    'og:image:alt',
  ]) {
    const content = ogTag(tag);
    assert.ok(content && content.trim(), `${tag} is missing or empty`);
  }
  assert.equal(ogTag('og:type'), 'website');
  assert.equal(ogTag('og:url'), ORIGIN);
});

test('index.html declares a complete Twitter card', () => {
  assert.equal(nameTag('twitter:card'), 'summary_large_image');
  for (const tag of [
    'twitter:title',
    'twitter:description',
    'twitter:image',
    'twitter:image:alt',
  ]) {
    const content = nameTag(tag);
    assert.ok(content && content.trim(), `${tag} is missing or empty`);
  }
});

test('every shared URL is absolute and on the canonical origin', () => {
  for (const url of [
    linkHref('canonical'),
    ogTag('og:url'),
    ogTag('og:image'),
    nameTag('twitter:image'),
  ]) {
    assert.ok(url.startsWith(ORIGIN), `${url} is not on the canonical origin`);
  }
});

test('the Apple/PWA meta tags use the spelling the platforms actually read', () => {
  // `apple-mobile-web-app-status-bar` (no `-style`) is silently ignored, and
  // a colour is not a legal value for it either.
  assert.equal(
    html.includes('name="apple-mobile-web-app-status-bar"'),
    false,
    'misspelled apple-mobile-web-app-status-bar is back'
  );
  assert.ok(
    ['default', 'black', 'black-translucent'].includes(
      nameTag('apple-mobile-web-app-status-bar-style')
    )
  );
  assert.equal(nameTag('mobile-web-app-capable'), 'yes');
  assert.equal(nameTag('apple-mobile-web-app-capable'), 'yes');
});

test('every apple-touch-icon declares its size', () => {
  const links = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*>/gi) || [];
  assert.ok(links.length > 0, 'no apple-touch-icon links');
  for (const link of links) {
    assert.match(link, /\bsizes=["']\d+x\d+["']/, `unsized apple-touch-icon: ${link}`);
  }
});

test('every locally referenced asset exists on disk', () => {
  const local = [
    linkHref('manifest'),
    linkHref('shortcut icon'),
    ogTag('og:image').slice(ORIGIN.length),
    nameTag('twitter:image').slice(ORIGIN.length),
    ...(html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/gi) || []).map(
      (link) => link.match(/href=["']([^"']*)["']/i)[1]
    ),
  ];
  for (const asset of local) {
    assert.ok(existsSync(join(root, asset)), `${asset} is referenced but missing`);
  }
});

test('the share image is exactly the size og:image:width/height claims', () => {
  const png = readFileSync(join(root, 'images/og-cover.png'));
  // PNG: 8-byte signature, then the IHDR chunk — 4 length, 4 type, then
  // width and height as big-endian uint32.
  assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.equal(png.readUInt32BE(16), Number(ogTag('og:image:width')));
  assert.equal(png.readUInt32BE(20), Number(ogTag('og:image:height')));
});

test('the JSON-LD block is valid and describes the app', () => {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(block, 'no JSON-LD block');
  const data = JSON.parse(block[1]);
  assert.equal(data['@type'], 'SoftwareApplication');
  assert.equal(data.url, ORIGIN);
  assert.ok(data.name && data.description);
});

test('manifest.json has the keys an installable PWA needs', () => {
  for (const key of [
    'id',
    'name',
    'short_name',
    'description',
    'lang',
    'dir',
    'start_url',
    'scope',
    'display',
    'display_override',
    'background_color',
    'theme_color',
    'orientation',
    'categories',
    'icons',
    'screenshots',
  ]) {
    assert.ok(manifest[key] !== undefined, `manifest is missing "${key}"`);
  }
  // A calculator sheet is usable in both orientations.
  assert.notEqual(manifest.orientation, 'portrait-primary');
});

test('every manifest icon and screenshot exists, including a maskable icon', () => {
  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(root, icon.src)), `${icon.src} is missing`);
  }
  assert.ok(
    manifest.icons.some((icon) => icon.purpose === 'maskable'),
    'no maskable icon'
  );
  const forms = new Set();
  for (const shot of manifest.screenshots) {
    assert.ok(existsSync(join(root, shot.src)), `${shot.src} is missing`);
    forms.add(shot.form_factor);
  }
  assert.ok(forms.has('wide') && forms.has('narrow'), 'need a wide and a narrow screenshot');
});

test('robots.txt and sitemap.xml point at the canonical origin', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent: \*/m);
  assert.ok(robots.includes(`${ORIGIN}sitemap.xml`), 'robots.txt has no Sitemap line');
  const sitemap = read('sitemap.xml');
  assert.ok(sitemap.includes(`<loc>${ORIGIN}</loc>`), 'sitemap does not list the canonical URL');
});

// Guard for the hand-maintained copy list in the deploy workflow: a new root
// asset that index.html references but publish.yml does not copy would 404 in
// production while passing every other test here.
test('publish.yml copies every root-level asset the site references', () => {
  const workflow = read('.github/workflows/publish.yml');
  const copyLine = workflow.split('\n').find((line) => line.trim().startsWith('cp -r '));
  assert.ok(copyLine, 'no cp line in publish.yml');

  const referenced = new Set(['robots.txt', 'sitemap.xml']);
  for (const match of html.matchAll(/(?:href|src)=["'](?!https?:|\/\/|#|data:)([^"']+)["']/g)) {
    const top = match[1].replace(/^\.\//, '').split('/')[0];
    if (top && !top.startsWith('#')) referenced.add(top);
  }
  for (const asset of referenced) {
    assert.ok(copyLine.includes(` ${asset} `), `publish.yml does not copy "${asset}"`);
  }
});
