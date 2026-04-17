# buttermilk-react

React 19 bindings for [buttermilk](../buttermilk).

```sh
npm i buttermilk buttermilk-react react react-dom
```

## Client

```tsx
import { Router, Link, useParams } from 'buttermilk-react';
import { p } from 'buttermilk-react'; // core re-exports

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

`<Router>` and `<Link>` are isomorphic — the same import works from a Server
Component or a Client Component. Under React's `react-server` condition the
module swaps in stateless implementations at load time: `<Router>` matches
synchronously from a required `url` prop and `<Link>` emits a plain `<a>`.
Hooks stay client-only and throw a teaching error if called from a Server
Component.

## Server Components

For any server-render target (RSC, streaming SSR, edge), import from
`buttermilk-react/server`:

```ts
import { getRouteMatch, getPathname, getParams } from 'buttermilk-react/server';
```

Each helper is memoized via `React.cache()`, so repeated calls within a
single render reuse computation. You supply the URL from your framework's
request primitives (Next.js `headers()`, etc.).

## Peer dependencies

- `react@^19.0.0`
- `react-dom@^19.0.0`

ESM only. Node 20+.
