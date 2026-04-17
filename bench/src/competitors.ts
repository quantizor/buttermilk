// Competitors suite: compiled v3 vs the popular React/Node routers.
//
// Every adapter exposes the same `{ build, run }` shape, so the runner can
// treat them identically. We intentionally bench each router's *public* match
// path (the function its own users would hit in production) — no internal
// fast paths, no private caches.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printTable, runSuite, formatNs, type Row } from './runner.ts';
import * as v3compiled from './adapters/v3-compiled.ts';
import * as fmw from './adapters/find-my-way.ts';
import * as rr from './adapters/react-router.ts';
import * as wouter from './adapters/wouter.ts';
import * as tanstack from './adapters/tanstack.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'results');

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const all: Row[] = [];
  for (const adapter of [v3compiled, fmw, rr, wouter, tanstack] as const) {
    console.log(`\n→ ${adapter.label}`);
    const rows = await runSuite(adapter);
    all.push(...rows);
  }

  console.log('');
  printTable(all);

  console.log('\n— Relative to v3-compiled (lower is faster):');
  const byKey = (r: Row) => `${r.scenario}:${r.url_label}`;
  const v3Map = new Map<string, number>();
  for (const r of all) {
    if (r.adapter === v3compiled.label) v3Map.set(byKey(r), r.p50_ns);
  }
  const relHeader = ['adapter', 'scenario', 'url', 'p50', 'vs v3-compiled'];
  const relRows = all
    .filter((r) => r.adapter !== v3compiled.label)
    .map((r) => {
      const v3 = v3Map.get(byKey(r))!;
      const ratio = r.p50_ns / v3;
      return [
        r.adapter,
        r.scenario,
        r.url_label,
        formatNs(r.p50_ns),
        `${ratio.toFixed(1)}×`,
      ];
    });
  const widths = relHeader.map((h, i) =>
    Math.max(h.length, ...relRows.map((r) => r[i]!.length)),
  );
  const pad = (c: string, w: number) => c.padEnd(w, ' ');
  console.log(relHeader.map((h, i) => pad(h, widths[i]!)).join('  '));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of relRows) {
    console.log(row.map((c, i) => pad(c, widths[i]!)).join('  '));
  }

  const out = join(OUT_DIR, 'competitors.json');
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
