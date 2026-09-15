import { build } from 'vite';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const sizes = () => readdirSync('dist/assets').filter(name => /\.(js|css)$/.test(name)).map(name => {
  const data = readFileSync(`dist/assets/${name}`);
  return { name, bytes: data.length, gzip: gzipSync(data).length };
});
const before = sizes();
// Use the existing Vite configuration unchanged; inspect only the returned output.
const result = await build();
const bundles = (Array.isArray(result) ? result : [result]).flatMap(output => output.output);
const modules = bundles.filter(output => output.type === 'chunk').map(chunk => ({
  name: chunk.fileName,
  imports: chunk.imports,
  dynamicImports: chunk.dynamicImports,
  threeRoots: [...new Set(Object.keys(chunk.modules).filter(id => id.includes('/three/')).map(id => id.split('/three/')[0] + '/three'))],
  statsGLIncluded: Object.keys(chunk.modules).some(id => id.includes('/stats-gl/')),
  largestModules: Object.entries(chunk.modules).map(([id, value]) => ({ id, bytes: value.renderedLength })).sort((a, b) => b.bytes - a.bytes).slice(0, 12),
}));
const report = { before, after: sizes(), modules };
mkdirSync('output/playwright', { recursive: true });
writeFileSync('output/playwright/rc-bundle.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
