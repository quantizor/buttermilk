# buttermilk — working notes for Claude

## What this library is

buttermilk is a **predicate-based router**. A route is `{ match: Predicate, render }`
where the predicate can be a path pattern, a RegExp, a query-key check, a
guard function, an opaque `(req) → params | null`, or any `and`/`or` of those.

That flexibility — matching on anything, not just URL patterns — is the whole
pitch. Every API decision protects it.

Non-negotiable properties, in priority order:

1. **Correctness** — `findRoute` and the compiled `router.find()` must agree
   on every URL for the routes shapes they both support. The compiler is an
   optimisation, never a different semantics.
2. **Typed params through composition** — `ParamsOf<typeof pred>` must survive
   `and` (→ intersection), `or` (→ union), and template-literal path inference
   (`p('/users/:id')` → `{ id: string }`). Regressions here are bugs, not
   stylistic choices.
3. **Sub-microsecond match p50 at 1 000 routes** for static/param/miss on the
   compiled path, within 2× of find-my-way. This is measured, not asserted —
   see `bench/REPORT.md`. Any change touching `compile.ts` or `match.ts` must
   keep or improve the numbers.
4. **Zero React in `buttermilk`.** The core is framework-agnostic. React 19
   bindings live in `buttermilk-react`. Do not import React — direct or
   transitive — from `packages/buttermilk/`.
5. **React 19 only in `buttermilk-react`.** `use()`, `useSyncExternalStore`,
   stable Suspense. No 18 back-compat shims.
6. **RSC boundary is detected, not declared.** `<Router>` and `<Link>` are
   isomorphic — one module, two implementations, picked at load time via
   `typeof React.useRef !== 'function'` (absent under React's
   `react-server` condition). No `'use client'` banner. Under RSC,
   `<Router>` matches synchronously from a required `url` prop and
   `<Link>` renders a plain `<a>`. Hooks stay client-only and throw a
   teaching error if called from a Server Component. For match inspection
   without rendering, `buttermilk-react/server` re-exports
   `React.cache`-memoized helpers (`getRouteMatch`, `getPathname`,
   `getParams`, `getLocation`). Do not reach for React Context or
   browser-only APIs in the core package, ever.
7. **ESM-only output.** Both packages ship `.mjs` + `.d.mts` only. No CJS.
   Node 20+ resolves ESM natively; bundlers all prefer ESM; consumers stuck
   on legacy CJS tooling are out of scope.

Deliberately different from v2 (document in MIGRATING.md):

- `*` matches exactly one segment, no capture. `**` matches the remainder and
  must be the final segment. The v2 `*` was loose; v3 is predictable.
- `:param` rejects empty segments (trailing slash does not capture an empty
  string).

## What to change and what not to

- **Don't add features, backwards-compat shims, or speculative abstractions.**
  If something feels cleanup-adjacent, leave it alone unless the task says to
  touch it. Three similar lines beat a premature abstraction.
- **Don't write comments that narrate what the code does.** Well-named
  identifiers are the documentation. Only write comments for non-obvious
  *why*: invariants, V8 shape constraints, known pitfalls.
- **Don't widen predicate types to "help".** If `p('/users/:id')` can't infer
  its param object, fix inference. Don't stamp `Record<string, string>` on it.
- **Size budgets are real.** Core < 2 kB gz, `buttermilk-react` < 3 kB gz
  (see each package's `size-limit.config.ts`). Currently core is over —
  trimming is on the roadmap, do not grow it further.

## Benchmarking discipline

- `bench/baseline/v2/` is frozen. Do not edit it. Its numbers are the "before"
  anchor across every phase.
- New perf-relevant work runs `pnpm --filter @buttermilk/bench phase<N>` and
  appends to `bench/REPORT.md` before it merges.
- When you change `compile.ts` or `match.ts`, compare `phase4` numbers
  before/after in the PR body — p50 for each URL class at 1 000 routes.

## PR descriptions and Changesets

**Public-facing only.** Readers outside this repo see these. Keep them to
**what changed and why**, from a user's perspective. Strip all of:

- Internal task phases, todos, step-by-step plans, checkpoint numbering
- Benchmark raw logs (link to `bench/REPORT.md` instead)
- "We did X, then Y, then Z" narratives
- Agent / Claude Code references
- Anything that reads like a commit log

Good PR body (what we want):

> **Radix-tree compiler.** New `compile(routes)` entry point that returns a
> `CompiledRouter` with O(segments) dispatch instead of the linear scan in
> `findRoute`. At 1 000 routes, `router.find()` is ~3 500× faster than the
> v2 baseline on a param hit and within 2× of find-my-way. Existing
> `findRoute` is unchanged and remains the correctness oracle.
>
> No API changes for predicate combinators.

Bad PR body (what we don't want):

> This PR completes Phase 4 of the plan. I implemented the partitioner,
> wrote the radix tree node class, added 18 tests, ran checkpoint #2, and
> updated REPORT.md. See phase4.json for numbers.

Same rule for **changesets**. The markdown inside `.changeset/*.md` is what
ships as release notes. Write it as if a buttermilk user — not a
contributor — is reading it.

- ✅ "Adds `compile(routes)`: a radix-tree-backed router for apps with large
  route tables. Drop-in for `findRoute` when strict first-match across opaque
  predicates isn't required."
- ❌ "Phase 4: radix compiler + constraint executor. Closes TODO #10."

Single-line subjects stay simple: `feat: compile(routes)` or
`fix: :param no longer captures trailing slash`. Details go in the body,
still user-facing.

Never include phase numbers, plan references, or internal progress tracking
in titles, bodies, commit messages, or changelog entries.

## Verification before claiming done

- `pnpm --filter buttermilk test` — 59+ tests, type tests included, all green.
- `pnpm --filter buttermilk build` — tsdown emits `.mjs/.cjs/.d.mts/.d.cts`.
- `pnpm --filter @buttermilk/bench phase4` — numbers in target range.
- For `buttermilk-react`: `pnpm --filter buttermilk-react test` in jsdom.

UI or feature correctness is not verified by type-checks or unit tests
passing. If a change touches rendering, start the app and exercise it;
if you can't, say so explicitly.
