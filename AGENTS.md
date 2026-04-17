# AGENTS.md

Notes for AI coding assistants and automation working in this repository.

This file augments `CLAUDE.md`. When the two overlap, `CLAUDE.md` is authoritative for Claude; this file is authoritative for everything else (Copilot, Cursor, Codex, etc.). Both files should stay short and concrete.

## Maintaining `apps/docs/public/llms.txt`

`/llms.txt` is the public LLM cheatsheet for buttermilk. It is served from `https://buttermilk.js.org/llms.txt` and is indexed by AI assistants and code-generation tools that consume library docs.

Treat it as **release notes for robots**. Whenever any of the following changes, update `llms.txt` in the same PR:

- A new or removed public export from `buttermilk` or `buttermilk-react` (or `buttermilk-react/server`).
- A breaking change to route shape, predicate syntax, or the `RouteRequest` / `MatchResult` / `Location` types.
- A new best-practice or scenario worth steering LLMs toward (e.g. RSC + `<Router>` hybrid, scroll-restoration pattern, prefetch recipe).
- A change to the "Things v3 does not do" list, so tools stop asserting features that were removed.

Keep the file:

- ≈ 250 lines or fewer. Dense, not comprehensive. Link to the website for depth.
- In plain prose + fenced code blocks. No tables, no HTML. Headings are `##`.
- API-surface accurate. Copy names from the code, do not paraphrase.
- Versionless in prose. Release notes drift; the cheatsheet describes *current* behavior.

Verify the file is reachable after a docs deploy: `curl https://buttermilk.js.org/llms.txt` should return 200 with `content-type: text/plain`.

## Other docs-site touchpoints

- `apps/docs/public/sitemap.xml` must list every top-level route. Add an entry when a new page goes into `apps/docs/src/App.tsx`.
- `apps/docs/index.html` carries site-wide meta (OG, Twitter, JSON-LD). Keep it in sync with the pitch — if the pitch changes, the meta changes.
- Per-page `<title>` / description lives in each page component via `useDocumentHead`. Add one when you add a page.

## Where not to touch

- `bench/baseline/v2/` — frozen. The v2 source there is the permanent "before" anchor. Do not edit.
- `packages/buttermilk/` — the core is vanilla. Do not import React (direct or transitive) from anything under this path.

## Before committing

- `pnpm -r test` passes.
- `pnpm -r build` passes.
- `pnpm -r typecheck` passes.
- If `packages/*/src` changed, `pnpm --filter @buttermilk/bench phase4` numbers are in range (see `bench/REPORT.md`).
- `package.json` `exports` changes are never a patch release — flag in the changeset.

## Finalizing a big change — surface audit

When a change touches the public API, the routing semantics, or the pitch, walk this list before opening / updating the PR. Things drift because different files repeat the same claim in different words.

**API surface** (add/rename/remove any public export):

- `packages/buttermilk/src/index.ts` — core barrel.
- `packages/buttermilk-react/src/index.tsx` — re-exports from core.
- `packages/buttermilk-react/src/server.ts` — RSC helpers.
- `packages/buttermilk/src/*.test-d.ts` — type-level tests.
- `packages/*/size-limit.config.ts` — budgets still met.

**Docs** (any user-visible change):

- `README.md` — pitch, first example, comparison table.
- `MIGRATING.md` — v2 → v3 diffs; anything users will look for when upgrading.
- `apps/docs/public/llms.txt` — cheatsheet + API-reference block. Rules in the section above.
- `apps/docs/index.html` — site-wide meta, JSON-LD, OG / Twitter cards.
- `apps/docs/public/sitemap.xml` — one entry per top-level route.
- `apps/docs/src/App.tsx` — route table.
- `apps/docs/src/pages/Examples.tsx` — live demo of every public predicate / hook.
- `apps/docs/src/pages/*.tsx` `useDocumentHead` — per-page title + description.

**Release notes**:

- `.changeset/*.md` — user-facing prose, not a contributor log. Update the matching changeset when a pre-release shipping file changes what users write.

**Conventions**:

- `CLAUDE.md` / `AGENTS.md` — update when the rule you just followed wasn't written down, or when an existing rule is now wrong.
