import { cp, mkdir, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'netlify-site');

// Export only public website files, never project configuration or secrets.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ['index.html', 'css', 'js', 'assets']) {
    await cp(join(root, entry), join(output, entry), {
        recursive: true,
        filter: source => !basename(source).startsWith('.'),
    });
}
console.log('Static website exported to netlify-site/');
