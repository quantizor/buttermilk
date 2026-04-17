[![npm](https://img.shields.io/npm/v/buttermilk.svg)](https://npm.im/buttermilk)

# buttermilk

A **predicate-based router** for JavaScript. A route is a predicate plus a
render function. The predicate can be a path pattern, a RegExp, a query-key
check, a guard, an arbitrary `(req) → params | null`, or any
`and` / `or` of those. TypeScript infers the params through composition.

```ts
import { and, p, query, or } from 'buttermilk';

const routes = [
  { match: p('/'),                        render: () => <Home /> },
  { match: p('/users/:id'),               render: ({ params }) => <User id={params.id} /> },
  { match: and(p('/search'), query('q')), render: ({ params }) => <Search q={params.q} /> },
  { match: or(p('/admin'), guard(isStaff)), render: () => <Admin /> },
  { match: p('/**'),                      render: () => <NotFound /> },
];
```

Params are typed end-to-end: `p('/users/:id')` gives you `{ id: string }`
without any schema declaration, `and(a, b)` intersects, `or(a, b)` unions.

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
| Core has zero React           | framework baked in                |

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
import { p, and, query } from 'buttermilk-react'; // re-exported for convenience

function User() {
  const { id } = useParams<{ id: string }>();
  return <h1>user {id}</h1>;
}

const routes = [
  { match: p('/'),          render: () => <h1>home</h1> },
  { match: p('/users/:id'), render: () => <User /> },
  { match: p('/**'),        render: () => <h1>404</h1> },
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

The interactive `<Router>` / `<Link>` / hooks are `'use client'`. For RSC,
import from `buttermilk-react/server` instead:

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

## Upgrading from v2

See [`MIGRATING.md`](./MIGRATING.md). The most important changes:

- Package split: React bindings now live in `buttermilk-react`.
- Path wildcards: `*` matches exactly one segment (no capture); `**` matches
  the remainder. The old `*` was loose and hard to reason about.
- A route is now `{ match: Predicate, render }` instead of `{ path, render }`.
- React 19 only. Drop `prop-types`, `react-is`, etc.

## License

MIT © Evan Jacobs
