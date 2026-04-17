import { measure } from 'mitata';
import { makeScenarios, type Scenario } from './fixtures.ts';

export type Adapter<C> = {
  label: string;
  build: (routes: Scenario['routes']) => C;
  run: (compiled: C, url: string) => unknown;
};

export type Row = {
  adapter: string;
  scenario: string;
  url_label: string;
  url: string;
  p50_ns: number;
  p75_ns: number;
  p99_ns: number;
  avg_ns: number;
  samples: number;
  /** GC total (ns) over the sampled window, when --expose-gc is available. */
  gc_total_ns?: number;
};

export interface RunOptions {
  /** Warmup iterations per cell. Default 500 — enough for V8 to tier up
   *  (Ignition → Sparkplug → Maglev → TurboFan typically complete in
   *  200–300 iterations on hot code). */
  warmupSamples?: number;
  /** Minimum statistically-good samples. Default 128. */
  minSamples?: number;
  /** Minimum CPU budget per cell in ms. Default 400. */
  minCpuTimeMs?: number;
  /** Force GC between samples (requires --expose-gc). Default true. */
  forceGc?: boolean;
}

/**
 * Pre-run settle: warm up V8 shape caches, force a clean heap, then pause
 * long enough for the concurrent marker to drain. The pause also gives the
 * OS scheduler a chance to re-seat this thread on a single core.
 */
export async function settle(): Promise<void> {
  if (typeof (globalThis as { gc?: () => void }).gc === 'function') {
    (globalThis as { gc: () => void }).gc();
    (globalThis as { gc: () => void }).gc();
  }
  await new Promise((r) => setTimeout(r, 20));
}

export async function runSuite<C>(
  adapter: Adapter<C>,
  opts: RunOptions = {},
): Promise<Row[]> {
  const {
    warmupSamples = 500,
    minSamples = 128,
    minCpuTimeMs = 400,
    forceGc = true,
  } = opts;

  const hasGc = typeof (globalThis as { gc?: () => void }).gc === 'function';

  const rows: Row[] = [];
  const scenarios = makeScenarios();

  for (const scenario of scenarios) {
    const compiled = adapter.build(scenario.routes);

    for (const { label: url_label, url } of scenario.urls) {
      // Pre-warm so V8 tiers the function up (Ignition → Sparkplug → Maglev
      // → TurboFan). Most tier-ups happen within the first few hundred
      // invocations. We also bail out after `warmupMaxMs` so slow adapters
      // (react-router at ms/op) don't eat the whole budget in warmup.
      const warmupDeadline = performance.now() + 200;
      for (let i = 0; i < warmupSamples; i++) {
        adapter.run(compiled, url);
        if ((i & 63) === 63 && performance.now() > warmupDeadline) break;
      }

      // Baseline heap: force a young + full GC before the measured window
      // so samples run on as clean a heap as we can arrange.
      await settle();

      // Force a GC between sample batches when --expose-gc is available.
      // mitata expects a callable; `true` isn't accepted, and it falls back
      // to no-op when undefined. We pass the platform's exposed hook
      // explicitly so behaviour is obvious and reproducible.
      const gcFn =
        forceGc && hasGc ? (globalThis as { gc: () => void }).gc : undefined;

      const stats = await measure(
        () => adapter.run(compiled, url),
        {
          min_cpu_time: minCpuTimeMs,
          warmup_samples: 16,
          min_samples: minSamples,
          ...(gcFn ? { gc: gcFn, inner_gc: true } : {}),
        } as Parameters<typeof measure>[1],
      );

      rows.push({
        adapter: adapter.label,
        scenario: scenario.name,
        url_label,
        url,
        p50_ns: stats.p50,
        p75_ns: stats.p75,
        p99_ns: stats.p99,
        avg_ns: stats.avg,
        samples: stats.samples.length,
        gc_total_ns: stats.gc?.total,
      });

      // Drain GC between URLs so the next cell doesn't pay for this one's
      // accumulated heap.
      await settle();
    }
  }

  return rows;
}

export function formatNs(ns: number): string {
  if (ns < 1000) return `${ns.toFixed(1)} ns`;
  if (ns < 1_000_000) return `${(ns / 1000).toFixed(2)} µs`;
  return `${(ns / 1_000_000).toFixed(2)} ms`;
}

export function printTable(rows: Row[]): void {
  const header = ['adapter', 'scenario', 'url', 'p50', 'p99', 'avg'];
  const widths = header.map((h) => h.length);
  const text = rows.map((r) => [
    r.adapter,
    r.scenario,
    r.url_label,
    formatNs(r.p50_ns),
    formatNs(r.p99_ns),
    formatNs(r.avg_ns),
  ]);
  for (const row of text) {
    row.forEach((c, i) => { widths[i] = Math.max(widths[i]!, c.length); });
  }
  const pad = (c: string, w: number) => c.padEnd(w, ' ');
  console.log(header.map((h, i) => pad(h, widths[i]!)).join('  '));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of text) {
    console.log(row.map((c, i) => pad(c, widths[i]!)).join('  '));
  }
}
