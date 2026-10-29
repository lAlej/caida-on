// Empaqueta el servidor en un único archivo (`dist/index.js`).
// El código compartido (`@caida/shared`) se incluye dentro; las demás dependencias se
// instalan con npm y se cargan desde `node_modules` al arrancar.
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies ?? {}).filter((name) => name !== '@caida/shared');

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
  logLevel: 'info',
});
