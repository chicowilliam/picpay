import { readdirSync, readFileSync } from 'node:fs';

const directory = process.argv[2];
if (!directory) throw new Error('Usage: node scripts/summarize-lighthouse.mjs <directory>');

const reports = readdirSync(directory)
  .filter(name => name.endsWith('.json'))
  .sort()
  .map(name => {
    const report = JSON.parse(readFileSync(`${directory}/${name}`, 'utf8'));
    const audit = id => report.audits[id]?.numericValue ?? null;
    const score = id => Math.round((report.categories[id]?.score ?? 0) * 100);
    return {
      name,
      benchmarkIndex: report.environment?.benchmarkIndex ?? null,
      scores: {
        performance: score('performance'),
        accessibility: score('accessibility'),
        bestPractices: score('best-practices'),
        seo: score('seo'),
      },
      metrics: {
        fcp: audit('first-contentful-paint'),
        lcp: audit('largest-contentful-paint'),
        cls: audit('cumulative-layout-shift'),
        tbt: audit('total-blocking-time'),
        speedIndex: audit('speed-index'),
        tti: audit('interactive'),
      },
      transferBytes: audit('total-byte-weight'),
      mainThreadMs: audit('mainthread-work-breakdown'),
      unusedJsBytes: report.audits['unused-javascript']?.details?.overallSavingsBytes ?? 0,
      bootup: report.audits['bootup-time']?.details?.items?.map(item => ({ url: item.url, total: item.total, scripting: item.scripting })).slice(0, 6) ?? [],
      longTasks: report.audits['long-tasks']?.details?.items?.map(item => ({ url: item.url, duration: item.duration, startTime: item.startTime })).slice(0, 10) ?? [],
      errors: report.runWarnings,
    };
  });

console.log(JSON.stringify(reports, null, 2));
