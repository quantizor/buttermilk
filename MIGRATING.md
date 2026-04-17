# Migrating from buttermilk v2 → v3

v3 is a ground-up rewrite. The predicate-based routing idea is the same;
everything around it changed.

## Package split

React bindings now live in a separate package. Update your imports:

```diff
- import { Router, Link, match, route } from 'buttermilk';
+ import { Router, Link } from 'buttermilk-react';
+ import { p, matchRoute } from 'buttermilk';
```

If your code only uses the matching utilities (no React), you can depend on
`buttermilk` alone and skip the React peer dependency entirely.

## Route shape

A route is now `{ match: Predicate, render }` instead of `{ path, render }`:

```diff
- const routes = [
-   route('/users/:id', User),
-   route('/', Home),
-   route('*', NotFound),
- ];
+ import { p } from 'buttermilk';
+ const routes = [
+   { match: p('/users/:id'), render: ({ params }) => <User id={params.id} /> },
+   { match: p('/'),          render: () => <Home /> },
+   { match: p('/**'),        render: () => <NotFound /> },
+ ];
```

The render function receives a `MatchResult` with typed `params` and a
parsed `location`. No more `this.props.match`.

## Wildcard semantics changed

| Pattern | v2 behavior                               | v3 behavior                                     |
| ------- | ----------------------------------------- | ----------------------------------------------- |
| `*`     | Loose — any number of segments            | Exactly one non-empty segment; no capture       |
| `**`    | (did not exist)                           | Zero or more remaining segments; must be last   |
| `:name` | Captured any segment, including empty     | Captures a single non-empty segment             |

If you depended on the loose `*`, replace it with `**`:

```diff
- { path: '/docs/*', render: ... }
+ { match: p('/docs/**'), render: ... }
```

## Composition replaces ad-hoc predicates

v2 let you pass a function as `path`. v3 keeps the escape hatch (`custom()`)
but prefers typed combinators:

```diff
- { path: (req) => req.url.includes('/admin') && req.headers.role === 'staff', ... }
+ import { and, guard, p } from 'buttermilk';
+ {
+   match: and(p('/admin/**'), guard((r) => r.headers?.role === 'staff')),
+   render: ...,
+ }
```

`and` / `or` infer the params correctly; `guard()` contributes no params;
`custom()` lets you return an arbitrary typed object.

## Redirects

Routes can still redirect, but the redirect key is on the route itself:

```diff
- { path: '/old', redirect: '/new' }
+ { match: p('/old'), redirect: '/new', render: () => null }
```

Function redirects receive the match result:

```ts
{
  match: p('/users/:id'),
  redirect: ({ params }) => `/u/${params.id}`,
  render: () => null,
}
```

## `match()` → `findRoute()` / `compile()`

v2's `match(routes, url)` became two functions:

- `findRoute(routes, request)` — linear scan, first match wins. Good for
  small route tables, strict first-match semantics, or mixing opaque
  predicates with path routes.
- `compile(routes)` — builds a radix-tree router, returns
  `{ find(request) }`. O(path segments) dispatch regardless of route count.
  Use this for apps with hundreds of routes or a measurable match cost.

Both take a `RouteRequest = { url, method?, headers? }` instead of a bare
URL string. For React apps, `<Router>` does this for you.

## React API

- `<Router>` — same idea. Accepts `routes` and an optional controlled `url`
  (for SSR).
- `<Link>` — unchanged surface; internally uses React 19's
  `startTransition`.
- `useParams()` — new hook. Typed via a caller generic.
- `useRoute()` / `useLocation()` — access to the active match.
- `useNavigate()` — imperative navigation; equivalent to clicking a
  matching `<Link>`.

All of the above are client-only. For Server Components, import from
`buttermilk-react/server`:

```ts
import { getRouteMatch, getPathname, getParams } from 'buttermilk-react/server';
```

These are `React.cache()`-wrapped so repeated calls within a single render
reuse work.

## Dropped

- `<RoutingState>` — replaced by `useRoute()` / `useLocation()`.
- `route()` helper — just write the object literal.
- `routeWillChange` Promise — use `use()` + Suspense on the render
  function instead.
- `prop-types`, `react-is`, `lite-url`, `lodash` — all gone.
- CJS output — ESM only. If you need CJS, use a bundler.

## React 19 requirement

`buttermilk-react` peer-depends on `react@^19.0.0` and
`react-dom@^19.0.0`. We use `use()`, `useSyncExternalStore`,
`startTransition`, and stable Suspense semantics.
