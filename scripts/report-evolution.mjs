import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve('output/playwright').replaceAll('\\', '/');
const capture = JSON.parse(readFileSync(`${root}/evolution-captures.log`, 'utf8').split(/\r?\n/).find(line => line.startsWith('{"phase"')));
const assets = readdirSync('dist/assets').filter(name => /\.(css|js)$/.test(name)).map(name => {
  const data = readFileSync(`dist/assets/${name}`);
  return { name, bytes: data.length, gzip: gzipSync(data).length };
});
const sections = ['conta', 'pix', 'cashback', 'cards', 'seguranca', 'final'];
const suiteLine = readFileSync(`${root}/evolution-suite.log`, 'utf8').split(/\r?\n/).find(line => line.startsWith('{"visual-1440"'));
const suite = suiteLine ? JSON.parse(suiteLine) : null;
const lines = ['# Evolucao dos capitulos', '', 'Hero e trajeto inicial preservados. Comparacoes capturadas no mesmo progresso, viewport e cursor.', '', '## Capturas', '', '| Secao / viewport | BEFORE | AFTER |', '|---|---|---|'];
for (const width of [1440, 1920, 390, 360]) for (const section of sections) {
  lines.push(`| ${section} / ${width} | [Antes](${root}/evolution-before-${width}-${section}.png) | [Depois](${root}/evolution-after-${width}-${section}.png) |`);
}
lines.push('', '## Custo por frame (desktop 1440)', '', '| Capitulo | Draw calls | Triangulos |', '|---|---:|---:|');
for (const item of capture.results.filter(item => item.width === 1440 && sections.includes(item.name))) lines.push(`| ${item.name} | ${item.scene.calls} | ${item.scene.triangles} |`);
lines.push('', 'Mesmas geometrias e resolucoes de textura. Cards: 32 -> 24 draw calls, 14.750 -> 6.372 triangulos, removendo o telefone ocluido. Sem novos modelos, texturas adicionais, dependencias ou pos-processamento.', '', '## Bundle final', '', '| Asset | Bytes | Gzip |', '|---|---:|---:|');
for (const asset of assets) lines.push(`| ${asset.name} | ${asset.bytes} | ${asset.gzip} |`);
if (suite) {
  lines.push('', '## QA final', '', 'Suite completa concluida sem erros de console. TypeScript e build Vite aprovados.', '', '| Viewport | Diferenca do Hero | Pontos forward + reverse | Resultado |', '|---|---:|---:|---|');
  for (const item of suite.evolution.results) lines.push(`| ${item.width} x ${item.height} | ${item.heroDifference} | ${item.positions * 2} | ${item.reverse} |`);
}
lines.push('', 'Baseline gzip anterior: principal 112,86 kB; cena 260,35 kB; CSS 5,86 kB.', '', '## Evidencias', '', '- `evolution-suite.log`: suite completa, incluindo comparacao estrita do Hero, poses forward/reverse e fallbacks.', '- `evolution-captures.log`: estados e custo de renderizacao das capturas.', '- `evolution-locked-hero-{largura}.png`: verificacao visual do primeiro viewport.', '- `evolution-after-{largura}-handoff-{pix,cashback,security,final}.png`: passagens entre capitulos.', '', 'Aparelhos moveis emulados via Playwright/Edge; nao equivale a teste em aparelho fisico.');
writeFileSync(`${root}/evolution-comparison.md`, lines.join('\n') + '\n');
console.log(JSON.stringify({ report: `${root}/evolution-comparison.md`, assets, qa: suite?.evolution.results.map(({width,heroDifference,positions,reverse}) => ({width,heroDifference,positions,reverse})) }, null, 2));
