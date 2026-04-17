import { describe, expect, it } from 'vitest';
import {
  and,
  custom,
  findRoute,
  guard,
  matchPredicate,
  matchRoute,
  or,
  p,
  query,
  regex,
} from './index.ts';
import type { Route, RouteRequest } from './index.ts';
import { parseUrl } from './url.ts';

function req(url: string): RouteRequest {
  return { url };
}

function match<P>(pred: Parameters<typeof matchPredicate<P>>[0], url: string) {
  const r = req(url);
  return matchPredicate(pred, r, parseUrl(r.url));
}

describe('matchPredicate — path', () => {
  it('matches root', () => {
    expect(match(p('/'), 'http://a/')).toEqual({});
  });

  it('matches literal segments', () => {
    expect(match(p('/about'), 'http://a/about')).toEqual({});
    expect(match(p('/about'), 'http://a/contact')).toBeNull();
  });

  it('captures a single param', () => {
    expect(match(p('/users/:id'), 'http://a/users/42')).toEqual({ id: '42' });
    expect(match(p('/users/:id'), 'http://a/users/')).toBeNull();
  });

  it('captures multiple params', () => {
    expect(match(p('/orgs/:o/repos/:r'), 'http://a/orgs/acme/repos/core')).toEqual({
      o: 'acme',
      r: 'core',
    });
  });

  it('rejects too-long paths', () => {
    expect(match(p('/users/:id'), 'http://a/users/42/extra')).toBeNull();
  });

  it('rejects too-short paths', () => {
    expect(match(p('/users/:id/posts'), 'http://a/users/42')).toBeNull();
  });

  it('* matches a single segment', () => {
    expect(match(p('/users/*'), 'http://a/users/42')).toEqual({});
    expect(match(p('/users/*'), 'http://a/users/42/extra')).toBeNull();
  });

  it('** matches remainder', () => {
    expect(match(p('/docs/**'), 'http://a/docs/')).toEqual({});
    expect(match(p('/docs/**'), 'http://a/docs/a/b/c')).toEqual({});
    expect(match(p('/docs/**'), 'http://a/other')).toBeNull();
  });

  it('ignores query and hash when matching path', () => {
    expect(match(p('/users/:id'), 'http://a/users/42?tab=x#frag')).toEqual({ id: '42' });
  });
});

describe('matchPredicate — regex', () => {
  it('matches with no groups', () => {
    expect(match(regex(/^\/posts\/[a-z-]+$/), 'http://a/posts/hello')).toEqual({});
    expect(match(regex(/^\/posts\/[a-z-]+$/), 'http://a/posts/1')).toBeNull();
  });

  it('extracts named groups as params', () => {
    const r = regex<{ slug: string }>(/^\/posts\/(?<slug>[a-z-]+)$/);
    expect(match(r, 'http://a/posts/hello-world')).toEqual({ slug: 'hello-world' });
  });
});

describe('matchPredicate — query', () => {
  it('matches when key is present', () => {
    expect(match(query('tab'), 'http://a/?tab=profile')).toEqual({ tab: 'profile' });
  });

  it('misses when key is absent', () => {
    expect(match(query('tab'), 'http://a/?other=x')).toBeNull();
  });

  it('handles empty value', () => {
    expect(match(query('tab'), 'http://a/?tab=')).toEqual({ tab: '' });
  });
});

describe('matchPredicate — guard', () => {
  it('passes when fn returns true', () => {
    expect(match(guard(() => true), 'http://a/')).toEqual({});
  });

  it('fails when fn returns false', () => {
    expect(match(guard(() => false), 'http://a/')).toBeNull();
  });

  it('sees the request', () => {
    const g = guard((r) => r.url.includes('/admin'));
    expect(match(g, 'http://a/admin/users')).toEqual({});
    expect(match(g, 'http://a/users')).toBeNull();
  });
});

describe('matchPredicate — custom (opaque)', () => {
  it('returns the user-supplied params object', () => {
    const c = custom<{ role: string }>((r) => (r.url.includes('/admin') ? { role: 'admin' } : null));
    expect(match(c, 'http://a/admin')).toEqual({ role: 'admin' });
    expect(match(c, 'http://a/home')).toBeNull();
  });
});

describe('matchPredicate — and/or', () => {
  it('and merges params', () => {
    const pred = and(p('/users/:id'), query('tab'));
    expect(match(pred, 'http://a/users/42?tab=profile')).toEqual({ id: '42', tab: 'profile' });
  });

  it('and short-circuits on first miss', () => {
    const pred = and(p('/users/:id'), query('tab'));
    expect(match(pred, 'http://a/users/42')).toBeNull();
    expect(match(pred, 'http://a/nope?tab=x')).toBeNull();
  });

  it('or returns first match', () => {
    const pred = or(p('/a/:x'), p('/b/:y'));
    expect(match(pred, 'http://a/a/1')).toEqual({ x: '1' });
    expect(match(pred, 'http://a/b/2')).toEqual({ y: '2' });
    expect(match(pred, 'http://a/c/3')).toBeNull();
  });

  it('nested compose', () => {
    const pred = and(or(p('/a/:x'), p('/b/:y')), query('flag'));
    expect(match(pred, 'http://a/a/1?flag=on')).toEqual({ x: '1', flag: 'on' });
    expect(match(pred, 'http://a/b/2?flag=on')).toEqual({ y: '2', flag: 'on' });
    expect(match(pred, 'http://a/b/2')).toBeNull();
  });
});

describe('matchRoute', () => {
  it('returns params and location on hit', () => {
    const route: Route<{ id: string }> = {
      match: p('/users/:id'),
      render: () => null,
    };
    const r = matchRoute(route, req('http://a/users/42?x=1'));
    expect(r?.params).toEqual({ id: '42' });
    expect(r?.location.pathname).toBe('/users/42');
    expect(r?.location.query).toEqual({ x: '1' });
  });

  it('returns null on miss', () => {
    const route: Route<{ id: string }> = {
      match: p('/users/:id'),
      render: () => null,
    };
    expect(matchRoute(route, req('http://a/orgs/42'))).toBeNull();
  });
});

describe('findRoute — first-match wins + redirects', () => {
  const fallback = { match: p('/**'), render: () => 'fallback' } as Route<unknown>;

  it('first-match wins', () => {
    const routes: Route<unknown>[] = [
      { match: p('/users/:id'), render: () => 'users' },
      { match: p('/:other'), render: () => 'other' },
      fallback,
    ];
    const hit = findRoute(routes, req('http://a/users/42'));
    expect(hit?.route.render(null as never)).toBe('users');
    expect(hit?.result.params).toEqual({ id: '42' });
  });

  it('follows string redirects', () => {
    const routes: Route<unknown>[] = [
      { match: p('/old'), redirect: '/new', render: () => null },
      { match: p('/new'), render: () => 'new' },
      fallback,
    ];
    const hit = findRoute(routes, req('http://a/old'));
    expect(hit?.route.render(null as never)).toBe('new');
  });

  it('follows function redirects', () => {
    const routes: Route<unknown>[] = [
      {
        match: p('/users/:id'),
        redirect: ({ params }) => `/u/${(params as { id: string }).id}`,
        render: () => null,
      },
      { match: p('/u/:id'), render: () => 'short' },
      fallback,
    ];
    const hit = findRoute(routes, req('http://a/users/42'));
    expect(hit?.route.render(null as never)).toBe('short');
  });

  it('throws on redirect cycle beyond depth 10', () => {
    const routes: Route<unknown>[] = [
      { match: p('/a'), redirect: '/b', render: () => null },
      { match: p('/b'), redirect: '/a', render: () => null },
    ];
    expect(() => findRoute(routes, req('http://a/a'))).toThrow(/depth 10/);
  });

  it('returns null when no route matches and no fallback', () => {
    const routes: Route<unknown>[] = [{ match: p('/only'), render: () => null }];
    expect(findRoute(routes, req('http://a/other'))).toBeNull();
  });
});

describe('parseUrl', () => {
  it('parses absolute URL', () => {
    const loc = parseUrl('http://host/a/b?x=1&y=2#h');
    expect(loc.pathname).toBe('/a/b');
    expect(loc.search).toBe('?x=1&y=2');
    expect(loc.hash).toBe('#h');
    expect(loc.query).toEqual({ x: '1', y: '2' });
  });

  it('parses path-only URL', () => {
    const loc = parseUrl('/a/b?x=1');
    expect(loc.pathname).toBe('/a/b');
    expect(loc.query).toEqual({ x: '1' });
  });

  it('decodes percent-encoded query values', () => {
    const loc = parseUrl('/?name=Evan%20Jacobs');
    expect(loc.query).toEqual({ name: 'Evan Jacobs' });
  });

  it('empty pathname becomes "/"', () => {
    expect(parseUrl('http://host').pathname).toBe('/');
  });
});
