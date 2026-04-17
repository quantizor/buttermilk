# buttermilk

Predicate-based router — framework-agnostic core.

```sh
npm i buttermilk
```

```ts
import { and, compile, p, query } from 'buttermilk';

const router = compile([
  { match: p('/'),                          render: () => 'home' },
  { match: p('/users/:id'),                 render: ({ params }) => `user ${params.id}` },
  { match: and(p('/search'), query('q')),   render: ({ params }) => `q=${params.q}` },
  { match: p('/**'),                        render: () => '404' },
]);

router.find({ url: 'http://x/users/42' });
// → { route, result: { params: { id: '42' }, location } }
```

Predicates compose with `and` / `or`, produce typed params, and the radix
compiler keeps `router.find()` in the sub-microsecond range at 1 000+ routes.
React 19 bindings are in [`buttermilk-react`](../buttermilk-react). Full docs,
migration, and benchmarks in the [repo root](https://github.com/quantizor/buttermilk).

## API surface

```ts
// Combinators
p(pattern)                // path predicate; infers params from ":name"
regex<P>(re)              // RegExp; caller provides param type
query(key)                // { [key]: string } when present
guard(fn)                 // boolean predicate; no params
custom<P>(fn)             // opaque (req) → P | null
and(a, b)                 // intersect
or(a, b)                  // union

// Matching
findRoute(routes, req)    // linear, strict first-match
compile(routes).find(req) // O(segments) via radix tree
matchPredicate(pred, req, loc)   // evaluate a single predicate
matchRoute(route, req)    // evaluate a single route
parseUrl(url)             // hand-parsed Location
```

ESM only. Node 20+.
