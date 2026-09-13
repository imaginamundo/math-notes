import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const port = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
};

// The documentation site is built directly into docs/, so it is served like any
// other directory (with a directory-index fallback below).
function resolvePath(url) {
  return decodeURIComponent(String(url).split('?')[0]);
}

// Serve a file, falling back to its directory index (`/docs/pt/` →
// `…/pt/index.html`) so clean URLs work like they do on GitHub Pages.
async function readResponse(path) {
  const resolved = join(root, normalize(path));
  if (relative(root, resolved).startsWith('..')) throw new Error('outside root');
  try {
    return { file: await readFile(resolved), type: extname(resolved) };
  } catch (error) {
    if (error.code === 'EISDIR' || (error.code === 'ENOENT' && !extname(resolved))) {
      return { file: await readFile(join(resolved, 'index.html')), type: '.html' };
    }
    throw error;
  }
}

createServer(async (req, res) => {
  try {
    let path = resolvePath(req.url);
    if (path.endsWith('/')) path += 'index.html';
    const { file, type } = await readResponse(path);
    res.writeHead(200, {
      'Content-Type': MIME[type] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`Math Notes dev server: http://localhost:${port}`);
});
