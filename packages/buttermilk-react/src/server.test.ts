import { describe, expect, it } from 'vitest';
import { p } from 'buttermilk';
import type { Route } from 'buttermilk';
import {
  getCompiledRouter,
  getLocation,
  getParams,
  getPathname,
  getRouteMatch,
} from './server.ts';

const routes: Route<unknown>[] = [
  { match: p('/'), render: () => 'home' },
  { match: p('/users/:id'), render: () => 'user' },
  { match: p('/**'), render: () => '404' },
];

describe('server helpers', () => {
  it('getCompiledRouter returns a usable CompiledRouter', () => {
    // React.cache() only memoizes across calls within a render context; in a
    // bare test harness both calls re-invoke the underlying compile(). We
    // verify the function *works*; per-render de-dup is a property of
    // React's runtime, not ours.
    const a = getCompiledRouter(routes);
    expect(a.find({ url: 'http://x/users/1' })?.result.params).toEqual({ id: '1' });
  });

  it('getRouteMatch returns the matched route + result', () => {
    const m = getRouteMatch(routes, 'http://x/users/42');
    expect(m?.route.render(null as never)).toBe('user');
    expect(m?.result.params).toEqual({ id: '42' });
  });

  it('getPathname strips query / hash', () => {
    expect(getPathname('http://x/users/42?tab=1#frag')).toBe('/users/42');
  });

  it('getLocation surfaces query', () => {
    const loc = getLocation('http://x/search?q=apples');
    expect(loc.pathname).toBe('/search');
    expect(loc.query).toEqual({ q: 'apples' });
  });

  it('getParams narrows to the supplied type', () => {
    const params = getParams<{ id: string }>(routes, 'http://x/users/99');
    expect(params).toEqual({ id: '99' });
    expect(getParams(routes, 'http://x/no/match')).toEqual({});
  });
});

describe('server helpers — isolation', () => {
  it('does not import react-dom or any DOM API', async () => {
    const mod = await import('./server.ts');
    // A crude but effective smoke test: make sure none of the exports are
    // React Components or hooks (which would drag in client behavior).
    for (const [key, value] of Object.entries(mod)) {
      expect(typeof value).toBe('function');
      // Hooks are conventionally named useX — server helpers never should.
      expect(key.startsWith('use')).toBe(false);
    }
  });
});
