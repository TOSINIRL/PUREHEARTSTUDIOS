// Test-only server: a separate port, no credentials, no mail or write endpoints.
import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://test').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!(relative === 'index.html' || /^(css|js|assets)\//.test(relative)) ||
        relative.split('/').some(segment => segment.startsWith('.'))) {
      response.writeHead(404).end();
      return;
    }
    const filename = await realpath(resolve(root, relative));
    if (!filename.startsWith(resolve(root) + sep)) {
      response.writeHead(404).end();
      return;
    }
    const content = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': `${types[extname(filename)] || 'application/octet-stream'}`,
      'Content-Length': content.length,
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, '127.0.0.1', () => {
  console.log('Isolated smoke-test server ready on port 4173');
});
