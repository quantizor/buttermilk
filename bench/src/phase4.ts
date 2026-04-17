// Phase 4 checkpoint: compiled v3 matcher vs v2, v3-naive, and find-my-way.
// Target: sub-µs p50 for static/param hits @ 1 000 routes; within 2× of
// find-my-way p50.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printTable, runSuite, type Row } from './runner.ts';
import * as v2 from './adapters/v2.ts';
import * as v3naive from './adapters/v3-naive.ts';
import * as v3compiled from './adapters/v3-compiled.ts';
import * as fmw from './adapters/find-my-way.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'results');

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const all: Row[] = [];
  for (const adapter of [v2, v3naive, v3compiled, fmw] as const) {
    console.log(`\n→ ${adapter.label}`);
    const rows = await runSuite(adapter);
    all.push(...rows);
  }

  console.log('');
  printTable(all);

  const out = join(OUT_DIR, 'phase4.json');
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
