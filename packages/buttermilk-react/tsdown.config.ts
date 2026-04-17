import { defineConfig } from 'tsdown';

export default defineConfig([
  // Main entry: isomorphic Router / Link / hooks. At load we detect React's
  // `react-server` condition (via absence of `useRef`) and pick server-safe
  // or interactive implementations. No 'use client' banner — users import
  // from either side of the RSC boundary with the same specifier.
  {
    entry: { index: 'src/index.tsx' },
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'es2022',
    treeshake: true,
    minify: false,
    external: ['react', 'react-dom', 'buttermilk'],
    define: { __BROWSER__: 'false' },
  },
  // Browser entry: same source, but `__BROWSER__` is defined true so the
  // minifier DCE's the ServerRouter / ServerLink bodies and the hook
  // teaching-error strings. Picked by bundlers resolving the `browser`
  // condition. No `.d.ts` — the main entry's types are reused.
  {
    entry: { 'index.browser': 'src/index.tsx' },
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    target: 'es2022',
    treeshake: true,
    minify: true,
    external: ['react', 'react-dom', 'buttermilk'],
    define: { __BROWSER__: 'true' },
  },
  // `/server` subpath: framework-agnostic match inspection helpers built on
  // `React.cache()`. For Server Components that want the match without
  // rendering — e.g. reading the pathname into a data attribute.
  {
    entry: { server: 'src/server.ts' },
    format: ['esm'],
    dts: true,
    clean: false,
    sourcemap: true,
    target: 'es2022',
    treeshake: true,
    minify: false,
    external: ['react', 'buttermilk'],
  },
]);
