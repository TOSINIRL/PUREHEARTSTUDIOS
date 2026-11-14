import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://site').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const segments = relative.split('/');
    const allowed = relative === 'index.html' ||
      ['css', 'js', 'assets'].includes(segments[0]);

    if (!allowed || segments.some(segment => segment.startsWith('.'))) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const filename = await realpath(resolve(root, relative));
    if (!filename.startsWith(resolve(root) + sep)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const content = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': types[extname(filename)] || 'application/octet-stream',
      'Content-Length': content.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    const status = error instanceof URIError ? 400 :
      ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : 500;
    if (status === 500) console.error(error);
    response.writeHead(status);
    response.end(status === 400 ? 'Bad request' : status === 404 ? 'Not found' : 'Server error');
  }
}).listen(5000, '0.0.0.0', () => {
  console.log('PureHeartedStudio is running on port 5000');
});
