---
'buttermilk': major
'buttermilk-react': major
---

Ground-up rewrite. `buttermilk` is now a predicate-based router with typed param inference through composition. Routes are `{ match, render }` where `match` is a predicate built from `path()`, `regex()`, `query()`, `guard()`, or `predicate()`, composed via `and` / `or`. `p` and `custom` are re-exported as short aliases. Invalid path patterns throw at call time with a message that names the rule and the fix.

The core ships a radix-tree compiler (`compile(routes)`) that dispatches in sub-microsecond time at 1 000+ routes. Linear-scan matching is still available via `findRoute(routes, req)` for strict first-match semantics.

React bindings moved to `buttermilk-react`. `<Router>` and `<Link>` are isomorphic — the same import works from a Server Component or a Client Component. Under React's `react-server` condition the module swaps in stateless implementations: `<Router>` matches synchronously from a required `url` prop and `<Link>` emits a plain `<a href>`. Hooks stay client-only and throw a teaching error if called from a Server Component. For match inspection without rendering, `buttermilk-react/server` exposes `React.cache()`-backed helpers (`getRouteMatch`, `getPathname`, `getParams`, `getLocation`). A `browser`-condition entry ships a minified build with the RSC code paths dead-code-eliminated; bundlers resolve it automatically when targeting the browser.

Both packages ship as ESM only. Node 20+. See `MIGRATING.md` for the `*` / `**` semantic change and other upgrade notes.
