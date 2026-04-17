// Phase 0 baseline: lock buttermilk v2 + find-my-way reference numbers.
// Commit the resulting JSON as the "before" anchor for every later phase.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printTable, runSuite, type Row } from './runner.ts';
import * as v2 from './adapters/v2.ts';
import * as fmw from './adapters/find-my-way.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'results');

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const all: Row[] = [];
  for (const adapter of [v2, fmw] as const) {
    console.log(`\n→ ${adapter.label}`);
    const rows = await runSuite(adapter);
    all.push(...rows);
  }

  console.log('');
  printTable(all);

  const out = join(OUT_DIR, 'baseline.json');
  writeFileSync(
    out,
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        ts: new Date().toISOString(),
        rows: all,
      },
      null,
      2,
    ),
  );
  console.log(`\nwrote ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
