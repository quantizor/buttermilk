[![npm](https://img.shields.io/npm/v/buttermilk.svg)](https://npm.im/buttermilk)

# buttermilk

A **predicate-based router** for JavaScript. A route is a predicate plus a
render function. The predicate can be a path pattern, a RegExp, a query-key
check, a guard, an arbitrary `(req) → params | null`, or any
`and` / `or` of those. TypeScript infers the params through composition.

```ts
import { and, or, path, query, guard } from 'buttermilk';

const routes = [
  { match: path('/'),                        render: () => <Home /> },
  { match: path('/users/:id'),               render: ({ params }) => <User id={params.id} /> },
  { match: and(path('/search'), query('q')), render: ({ params }) => <Search q={params.q} /> },
  { match: or(path('/admin'), guard(isStaff)), render: () => <Admin /> },
  { match: path('/**'),                      render: () => <NotFound /> },
];
```

Params are typed end-to-end: `path('/users/:id')` gives you `{ id: string }`
without any schema declaration, `and(a, b)` intersects, `or(a, b)` unions.
`p` is a short alias for `path`; `predicate` is a short-alias-less equivalent
of the legacy `custom`. Use whichever reads best.

## Install

buttermilk v3 ships as two ESM packages:

```sh
# Framework-agnostic core
npm i buttermilk

# React 19 bindings (optional)
npm i buttermilk-react react react-dom
```

Node 20+. No CJS build — modern bundlers and Node all understand ESM.

## The pitch

Most routers force every route through one matching shape — a string path,
maybe a regex. That's fine until you want to route on a header, a cookie, a
feature flag, or some predicate that only makes sense for your app. You end
up escaping the router: a `middleware`, a `beforeEnter`, a wrapping
component, a custom hook. buttermilk lets you say "this route matches when
this function returns params" — and types it.

| buttermilk                    | most routers                      |
| ----------------------------- | --------------------------------- |
| `{ match, render }`           | path strings or file layouts      |
| `and` / `or` compose          | middleware + predicates separate  |
| Predicate → `params | null`   | boolean, no structured output     |
| Vanilla core, React is opt-in | framework baked in                |

## Performance

The core ships with a radix-tree compiler (`compile(routes)`). At 1 000
routes on Node 24, p50, each adapter run in an isolated subprocess:

| Router                | Static hit | Param hit | Miss     |
| --------------------- | ---------: | --------: | -------: |
| find-my-way           |      51 ns |    244 ns |   249 ns |
| **buttermilk v3**     |     113 ns |    419 ns |   285 ns |
| @tanstack/router-core |     155 ns |    408 ns |   558 ns |
| wouter                |      90 ns |  20.83 µs | 252.5 µs |
| react-router v7       |   ~12.4 ms |  ~8.3 ms  | ~13.5 ms |

Close to find-my-way (a purpose-built non-React HTTP router) across every
URL class, and ahead of every React-aware competitor on param and miss.
Competitor methodology, measurement setup, and type-check scaling in
[`bench/REPORT.md`](./bench/REPORT.md).

## Usage with React 19

```tsx
import { Router, Link, useParams } from 'buttermilk-react';
import { path, and, query } from 'buttermilk-react'; // re-exported for convenience

function User() {
  const { id } = useParams<{ id: string }>();
  return <h1>user {id}</h1>;
}

const routes = [
  { match: path('/'),          render: () => <h1>home</h1> },
  { match: path('/users/:id'), render: () => <User /> },
  { match: path('/**'),        render: () => <h1>404</h1> },
];

export default function App() {
  return (
    <Router routes={routes}>
      <nav><Link href="/users/42">go</Link></nav>
    </Router>
  );
}
```

### React Server Components

`<Router>` and `<Link>` are isomorphic — the same import works from a
Server or Client Component. Under React's `react-server` condition the
module swaps in stateless implementations: `<Router>` matches synchronously
from a required `url` prop and `<Link>` emits a plain `<a href>`. Hooks
stay client-only and throw a teaching error if called from a Server
Component.

```tsx
// app/layout.tsx — Server Component, no 'use client' needed
import { headers } from 'next/headers';
import { Router, Link } from 'buttermilk-react';
import { routes } from './routes';

export default async function Layout() {
  const url = (await headers()).get('x-url') ?? '/';
  return (
    <Router routes={routes} url={url}>
      <nav><Link href="/users/42">go</Link></nav>
    </Router>
  );
}
```

For match inspection without rendering — e.g. setting a data attribute
from the matched route in a Server Component — `buttermilk-react/server`
exposes `React.cache()`-wrapped helpers:

```ts
import { headers } from 'next/headers';
import { getRouteMatch, getPathname } from 'buttermilk-react/server';
import { routes } from './routes';

export default async function Layout({ children }) {
  const url = (await headers()).get('x-url') ?? '/';
  const pathname = getPathname(url);
  const match = getRouteMatch(routes, url);
  return <main data-route={pathname}>{children}</main>;
}
```

Each helper is wrapped in `React.cache()`, so calling them from multiple
Server Components in the same render reuses the computation.

### Browser-optimized bundle

`buttermilk-react` ships a `browser`-condition entry that drops the RSC
code paths entirely: the `<Router>` / `<Link>` server variants and their
teaching-error strings are dead-code-eliminated at build time, and the
output is minified. Vite, webpack, and esbuild resolve it automatically
when targeting the browser — there's nothing to configure. The full
isomorphic bundle still resolves under `default` and `react-server` for
SSR / RSC / Node.

## Upgrading from v2

See [`MIGRATING.md`](./MIGRATING.md). The most important changes:

- Package split: React bindings now live in `buttermilk-react`.
- Path wildcards: `*` matches exactly one segment (no capture); `**` matches
  the remainder. The old `*` was loose and hard to reason about.
- A route is now `{ match: Predicate, render }` instead of `{ path, render }`.
- React 19 only. Drop `prop-types`, `react-is`, etc.

## License

MIT © Evan Jacobs
