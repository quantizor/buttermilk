// Isolated cross-adapter runner.
//
// The naive runner (phase4, competitors) builds every adapter in the same
// Node process. After running react-router's matcher at 1 000 routes, the
// resident set carries several hundred kilobytes of route state. When the
// next adapter (wouter, tanstack, buttermilk) starts, it pays for that —
// more reference chasing in the marker, more cache misses in the sampled
// hot loop.
//
// This module runs each adapter in a fresh subprocess. The child process
// loads one adapter, warms it up against the same fixtures, and prints a
// single-line JSON result; the parent aggregates them.
//
// Always run with --expose-gc so mitata can quiesce between samples.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printTable, type Row } from './runner.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'results');

// Default set — every fast adapter. react-router matches in the millisecond
// range at 1 000 routes, which would blow the bench budget on every run, so
// we keep it behind ALL=1 for the full comparison sweep.
const FAST_ADAPTERS: { label: string; module: string }[] = [
  { label: 'buttermilk-v3-compiled', module: './adapters/v3-compiled.ts' },
  { label: 'find-my-way', module: './adapters/find-my-way.ts' },
  { label: 'wouter', module: './adapters/wouter.ts' },
  { label: 'tanstack', module: './adapters/tanstack.ts' },
];

const SLOW_ADAPTERS: { label: string; module: string }[] = [
  { label: 'react-router', module: './adapters/react-router.ts' },
];

const ADAPTER_MODULES = process.env.ALL
  ? [...FAST_ADAPTERS, ...SLOW_ADAPTERS]
  : FAST_ADAPTERS;

async function runOne(mod: string): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--expose-gc',
        '--experimental-strip-types',
        '--no-warnings=ExperimentalWarning',
        join(HERE, 'isolated-child.ts'),
        mod,
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    );

    const chunks: Buffer[] = [];
    child.stdout.on('data', (c) => chunks.push(c));
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`child exited ${code}`));
      const out = Buffer.concat(chunks).toString('utf8');
      // The child prints its rows on the final line prefixed with "ROWS:".
      const line = out.split('\n').find((l) => l.startsWith('ROWS:'));
      if (!line) return reject(new Error('child produced no ROWS line'));
      try {
        resolve(JSON.parse(line.slice('ROWS:'.length)) as Row[]);
      } catch (e) {
        reject(e);
      }
    });
    child.on('error', reject);
  });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const all: Row[] = [];
  for (const { label, module } of ADAPTER_MODULES) {
    console.log(`\n→ ${label} (fresh process)`);
    const rows = await runOne(module);
    all.push(...rows);
    for (const r of rows) {
      const gc = r.gc_total_ns ? ` gc_total=${(r.gc_total_ns / 1e6).toFixed(1)}ms` : '';
      console.log(
        `  ${r.scenario.padEnd(12)} ${r.url_label.padEnd(18)} p50=${r.p50_ns
          .toFixed(1)
          .padStart(7)} ns  samples=${r.samples}${gc}`,
      );
    }
  }

  console.log('');
  printTable(all);

  const out = join(OUT_DIR, 'isolated.json');
  writeFileSync(
    out,
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        ts: new Date().toISOString(),
        gc_exposed: true,
        warmup_samples: 500,
        min_samples: 128,
        min_cpu_time_ms: 400,
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
