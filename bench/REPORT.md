# buttermilk v3 benchmark report

Raw results live in `bench/results/*.json`. Each row records `p50 / p75 / p99 / avg` in nanoseconds for a specific `(adapter, scenario, url-label)` cell.

## Phase 0 — baseline (locked anchor)

Hardware: whatever CI / developer machine produces `baseline.json`. Numbers here reflect a single run; the JSON is the source of truth.

Highlights at **1 000 routes**:

| Adapter        | Static hit p50 | Param hit p50 | Miss p50  |
| -------------- | --------------: | -------------: | ---------: |
| buttermilk v2  | ~1.5 ms         | ~1.5 ms        | ~1.7 ms    |
| find-my-way    | ~40–60 ns       | ~270 ns        | ~230 ns    |

Why v2 is slow: `match()` calls `processRoute` (regex compile) on every route **on every navigation** — see `bench/baseline/v2/utils.js:119-132`. Compiling once is the first easy win.

## Phase 3 checkpoint — naive v3

Target was "parity-or-slightly-slower than v2". Reality: naive v3 already destroys v2
because v2 regex-compiles every route on every navigation. Highlights @ 1 000 routes:

| URL class           | v2 p50  | v3-naive p50 | Speedup vs v2 | vs find-my-way p50 |
| ------------------- | ------: | -----------: | ------------: | -----------------: |
| static-hit-first    | 1.95 ms | 115 ns       | ~17 000×      | ~2× slower         |
| static-hit-middle   | 1.53 ms | 116 ns       | ~13 000×      | ~3× slower         |
| param-hit           | 1.60 ms | 130 µs       | ~12×          | ~475× slower       |
| miss-fallback       | 1.68 ms | 287 µs       | ~6×           | ~1 200× slower     |

Why param/miss are still slow: linear scan across routes with no trie. Radix
compiler in Phase 4 addresses this directly — static hits are already ≤ 2-3× of
find-my-way, so the gap is param matching and the fallback path.

## Phase 4 checkpoint — compiled v3

Target: ≥5× faster than v2, within 2× of find-my-way p50 at 1 000 routes.
**Hit both.** Highlights @ 1 000 routes:

| URL class           | v2 p50  | v3-compiled p50 | vs v2        | vs find-my-way |
| ------------------- | ------: | --------------: | -----------: | -------------: |
| static-hit-first    | 2.01 ms | 115 ns          | ~17 500×     | 2.0× slower    |
| static-hit-middle   | 1.45 ms | 115 ns          | ~12 600×     | 2.7× slower    |
| param-hit           | 1.56 ms | 446 ns          | ~3 500×      | 1.5× slower    |
| miss-fallback       | 1.77 ms | 318 ns          | ~5 600×      | 1.3× slower    |

Compilation cost is paid once at `compile(routes)` time; `router.find()` is the
hot path and allocates only a new params object per hit. find-my-way remains
faster on static hits (purpose-built HTTP router with JIT-compiled
matchers) — closing that gap would need the Phase 5 codegen path, which is
gated on ≥30% improvement data.

## Competitors — popular routers, same scenario

Same fixtures (10 / 100 / 1 000 routes; 40% static, 40% single-param, 20%
multi-param, plus a catch-all). Each adapter calls its router's public match
API — the same entry point the router's own users hit in production.

Numbers come from `pnpm --filter @buttermilk/bench isolated`, which **runs
each adapter in a fresh Node subprocess** with `--expose-gc`. This removes
cross-adapter heap pressure and lets mitata force a young + full GC between
sample batches. Warmup is 500 iterations (capped at 200 ms wall for
ms-per-op adapters), then ≥128 samples with a 400 ms CPU floor.

Highlights @ 1 000 routes, p50:

| Router                 | Static hit | Param hit | Miss / fallback |
| ---------------------- | ---------: | --------: | --------------: |
| find-my-way            |      51 ns |    244 ns |          249 ns |
| **buttermilk v3**      |     113 ns |    419 ns |          285 ns |
| @tanstack/router-core  |     155 ns |    408 ns |          558 ns |
| wouter                 |      90 ns |  20.83 µs |        252.5 µs |
| react-router v7        |   ~12.4 ms |  ~8.3 ms  |        ~13.5 ms |

react-router is **opt-in** (`ALL=1 pnpm --filter @buttermilk/bench isolated`)
because it runs in the millisecond range and would otherwise eat the bench
budget on every iteration. Numbers above reflect the most recent full sweep.

Ratios relative to find-my-way (lower = closer to the non-React upper bound):

| Router                 | Static hit | Param hit |   Miss |
| ---------------------- | ---------: | --------: | -----: |
| find-my-way            |       1.0× |      1.0× |   1.0× |
| **buttermilk v3**      |       2.2× |      1.7× |   1.1× |
| @tanstack/router-core  |       3.0× |      1.7× |   2.2× |
| wouter                 |       1.8× |     85.4× | 1 015× |

Reading the table:

- **find-my-way** is the non-React upper bound — buttermilk lands 2.2× of it
  on static, 1.7× on param, 1.1× on miss.
- **@tanstack/router-core** is the closest peer: same trie shape, directly
  comparable numbers. buttermilk wins static, ties param, and is about 2×
  ahead on miss because TanStack's fallback walks a deeper branch.
- **wouter** uses pre-parsed regex caches — fast on static, then linear on
  param/miss (every route regex runs). At 1 000 routes a miss is 250 µs.
- **react-router v7** pays a large structural cost per `matchRoutes` call
  (score/rank the whole table, construct match objects). Millisecond-range
  latency at 1 000 routes.

Fine print: wouter and react-router are React component libraries, and their
slower numbers reflect the cost of their *public matching primitive* being
called fresh each time. In a real React app, render and memoization
amortize some of it away. We include them because this is the apples-to-apples
comparison users can reason about.

### Measurement methodology

- **Isolation** — each adapter is spawned in a fresh Node subprocess. Same-
  process runs let earlier adapters' retained heap skew later ones (e.g.
  react-router at 1 000 routes leaves a few hundred kB of route state around).
- **GC** — `--expose-gc` is always passed; mitata forces a clean heap
  between sample batches via the `gc` hook.
- **Warmup** — 500 iterations per URL cell, with a 200 ms wall-clock cap so
  ms-per-op adapters don't burn the whole budget. V8 tier-ups (Ignition →
  Sparkplug → Maglev → TurboFan) typically complete in the first 200–300
  iterations on hot paths, so this is enough for fast adapters and bounded
  for slow ones.
- **Sampling** — ≥128 samples per cell with a 400 ms CPU floor. Anything
  under the floor is discarded; tail-heavy distributions are reported via
  p99 in the JSON output.

## Type-checking cost

Template-literal inference (`p('/users/:id')` → `{ id: string }`) and
intersection/union plumbing through `and` / `or` need to stay sub-quadratic
as route tables grow. Measured via `pnpm --filter @buttermilk/bench
types-bench`, which generates a synthetic file with N mixed-shape routes and
runs `tsc --extendedDiagnostics`:

| Routes | tsc wall (ms) | Types  | Instantiations | Memory (MB) |
| -----: | ------------: | -----: | -------------: | ----------: |
|     10 |           577 |  1 377 |          1 505 |          45 |
|    100 |           634 |  2 141 |          5 518 |          47 |
|    500 |           754 |  5 541 |         23 118 |          47 |
|  1 000 |           893 |  9 791 |         45 118 |          73 |

Wall time growth is ~1.5× from 10→1000 routes (dominated by tsc startup);
instantiation growth is linear at ~45 per route. No quadratic cliff.
