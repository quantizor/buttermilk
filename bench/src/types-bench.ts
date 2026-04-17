// Type-checking performance benchmark.
//
// Generates a synthetic TS file with N routes composed via p()/and()/or()
// and times `tsc --noEmit` against it. Template-literal inference and
// intersection/union plumbing should stay linear in N — a regression here
// shows up as a quadratic or worse explosion in tsc time.

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT_DIR = join(HERE, '..', 'results', 'types');

const COUNTS = [10, 100, 500, 1000];

function genFile(count: number): string {
  const lines: string[] = [
    `import { and, or, p, query } from 'buttermilk';`,
    `import type { ParamsOf } from 'buttermilk';`,
    ``,
    `// ${count} predicates composed — exercises ExtractParams + and/or inference.`,
    `export const routes = [`,
  ];

  for (let i = 0; i < count; i++) {
    const shape = i % 4;
    if (shape === 0) {
      lines.push(`  { match: p('/s-${i}'), id: ${i} },`);
    } else if (shape === 1) {
      lines.push(`  { match: p('/users-${i}/:id'), id: ${i} },`);
    } else if (shape === 2) {
      lines.push(
        `  { match: and(p('/orgs-${i}/:o/repos/:r'), query('tab')), id: ${i} },`,
      );
    } else {
      lines.push(
        `  { match: or(p('/a-${i}/:a'), p('/b-${i}/:b')), id: ${i} },`,
      );
    }
  }

  lines.push(`] as const;`);
  lines.push(``);
  // A couple of type-level assertions to force tsc to actually evaluate the
  // types (otherwise it might short-circuit on unused inferences).
  lines.push(`type P0 = ParamsOf<(typeof routes)[0]['match']>;`);
  lines.push(`type P1 = ParamsOf<(typeof routes)[1]['match']>;`);
  lines.push(`type P2 = ParamsOf<(typeof routes)[2]['match']>;`);
  lines.push(`type P3 = ParamsOf<(typeof routes)[3]['match']>;`);
  lines.push(`export type All = P0 | P1 | P2 | P3;`);
  return lines.join('\n');
}

function genTsconfig(srcPath: string): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022'],
        module: 'esnext',
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        noUncheckedIndexedAccess: true,
        paths: {
          buttermilk: [join(ROOT, 'packages/buttermilk/src/index.ts')],
        },
      },
      include: [srcPath],
    },
    null,
    2,
  );
}

type Row = {
  count: number;
  ms: number;
  types: number;
  instantiations: number;
  memoryKB: number;
};

function time(n: number): Row {
  const dir = join(OUT_DIR, `n-${n}`);
  mkdirSync(dir, { recursive: true });

  const src = join(dir, 'gen.ts');
  const cfg = join(dir, 'tsconfig.json');
  writeFileSync(src, genFile(n));
  writeFileSync(cfg, genTsconfig('gen.ts'));

  const t0 = process.hrtime.bigint();
  const result = spawnSync(
    'node',
    [join(ROOT, 'node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc'), '-p', dir, '--extendedDiagnostics'],
    { encoding: 'utf8' },
  );
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;

  if (result.status !== 0) {
    console.error(`tsc failed (n=${n}):`);
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`tsc exit ${result.status}`);
  }

  const out = result.stdout;
  const types = parseNumber(out, /Types:\s*(\d+)/);
  const instantiations = parseNumber(out, /Instantiations:\s*(\d+)/);
  const memoryKB = parseNumber(out, /Memory used:\s*([\d,]+)K/);

  return { count: n, ms, types, instantiations, memoryKB };
}

function parseNumber(text: string, re: RegExp): number {
  const m = text.match(re);
  if (!m || !m[1]) return 0;
  return Number(m[1].replace(/,/g, ''));
}

async function main() {
  const rows: Row[] = [];
  for (const c of COUNTS) {
    console.log(`→ n=${c}`);
    rows.push(time(c));
  }

  console.log('');
  console.log('count    ms      types     instantiations   memoryKB');
  console.log('-----  ------  -------  -----------------  ---------');
  for (const r of rows) {
    console.log(
      `${String(r.count).padStart(5)}  ${r.ms.toFixed(0).padStart(6)}  ${String(r.types).padStart(7)}  ${String(r.instantiations).padStart(17)}  ${String(r.memoryKB).padStart(9)}`,
    );
  }

  const out = join(HERE, '..', 'results', 'types-bench.json');
  writeFileSync(out, JSON.stringify({ ts: new Date().toISOString(), rows }, null, 2));
  console.log(`\nwrote ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
