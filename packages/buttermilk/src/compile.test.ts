import { describe, expect, it } from 'vitest';
import {
  and,
  compile,
  custom,
  guard,
  or,
  p,
  query,
  regex,
} from './index.ts';
import type { Route, RouteRequest } from './index.ts';

function req(url: string): RouteRequest {
  return { url };
}

describe('compile — basic routing', () => {
  it('matches static paths', () => {
    const router = compile([
      { match: p('/about'), render: () => 'about' },
      { match: p('/contact'), render: () => 'contact' },
    ] as Route<unknown>[]);
    expect(router.find(req('http://a/about'))?.route.render(null as never)).toBe('about');
    expect(router.find(req('http://a/contact'))?.route.render(null as never)).toBe('contact');
    expect(router.find(req('http://a/other'))).toBeNull();
  });

  it('captures :params and returns them in result', () => {
    const routes: Route<unknown>[] = [
      { match: p('/users/:id'), render: () => null },
    ];
    const router = compile(routes);
    const hit = router.find(req('http://a/users/42'));
    expect(hit?.result.params).toEqual({ id: '42' });
  });

  it('captures multiple :params in order', () => {
    const routes: Route<unknown>[] = [
      { match: p('/orgs/:o/repos/:r'), render: () => null },
    ];
    const router = compile(routes);
    const hit = router.find(req('http://a/orgs/acme/repos/core'));
    expect(hit?.result.params).toEqual({ o: 'acme', r: 'core' });
  });

  it('static wins over param at same depth', () => {
    const routes: Route<unknown>[] = [
      { match: p('/users/me'), render: () => 'me' },
      { match: p('/users/:id'), render: () => 'user' },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/users/me'))?.route.render(null as never)).toBe('me');
    expect(router.find(req('http://a/users/42'))?.route.render(null as never)).toBe('user');
  });

  it('* matches a single segment without capture', () => {
    const routes: Route<unknown>[] = [
      { match: p('/users/*'), render: () => 'wild' },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/users/42'))?.route.render(null as never)).toBe('wild');
    expect(router.find(req('http://a/users/42/extra'))).toBeNull();
    expect(router.find(req('http://a/users/'))).toBeNull();
  });

  it('** matches the remainder', () => {
    const routes: Route<unknown>[] = [
      { match: p('/docs/**'), render: () => 'docs' },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/docs/'))?.route.render(null as never)).toBe('docs');
    expect(router.find(req('http://a/docs/a/b/c'))?.route.render(null as never)).toBe('docs');
    expect(router.find(req('http://a/other'))).toBeNull();
  });

  it('catchall yields to a more specific static when both apply', () => {
    const routes: Route<unknown>[] = [
      { match: p('/docs/intro'), render: () => 'intro' },
      { match: p('/docs/**'), render: () => 'any' },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/docs/intro'))?.route.render(null as never)).toBe('intro');
    expect(router.find(req('http://a/docs/other'))?.route.render(null as never)).toBe('any');
  });

  it('rejects trailing segments beyond pattern', () => {
    const routes: Route<unknown>[] = [
      { match: p('/users/:id'), render: () => null },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/users/42/extra'))).toBeNull();
  });

  it('throws on ** that is not final', () => {
    expect(() =>
      compile([{ match: p('/docs/**/oops'), render: () => null } as Route<unknown>]),
    ).toThrow(/'\*\*' must be the final/);
  });
});

describe('compile — constraints after path match', () => {
  it('runs query() constraint and merges params', () => {
    const routes: Route<unknown>[] = [
      {
        match: and(p('/users/:id'), query('tab')),
        render: () => 'tab',
      },
    ];
    const router = compile(routes);
    const hit = router.find(req('http://a/users/42?tab=profile'));
    expect(hit?.result.params).toEqual({ id: '42', tab: 'profile' });
    // Miss when query key absent.
    expect(router.find(req('http://a/users/42'))).toBeNull();
  });

  it('falls through to next leaf when constraint fails', () => {
    const routes: Route<unknown>[] = [
      {
        match: and(p('/users/:id'), query('admin')),
        render: () => 'admin',
      },
      { match: p('/users/:id'), render: () => 'plain' },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/users/42?admin=1'))?.route.render(null as never)).toBe('admin');
    expect(router.find(req('http://a/users/42'))?.route.render(null as never)).toBe('plain');
  });

  it('runs regex() and guard() constraints', () => {
    const routes: Route<unknown>[] = [
      {
        match: and(
          p('/posts/:slug'),
          and(regex(/^\/posts\/[a-z-]+$/), guard((r) => r.url.includes('/posts/'))),
        ),
        render: () => 'post',
      },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/posts/hello'))?.route.render(null as never)).toBe('post');
    expect(router.find(req('http://a/posts/1'))).toBeNull();
  });
});

describe('compile — top-level or splits into multiple trie entries', () => {
  it('each branch is indexed independently', () => {
    const routes: Route<unknown>[] = [
      { match: or(p('/a/:x'), p('/b/:y')), render: () => 'ab' },
      { match: p('/**'), render: () => 'fallback' },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/a/1'))?.route.render(null as never)).toBe('ab');
    expect(router.find(req('http://a/b/2'))?.route.render(null as never)).toBe('ab');
    expect(router.find(req('http://a/c/3'))?.route.render(null as never)).toBe('fallback');
    // Params come through per branch.
    expect(router.find(req('http://a/a/1'))?.result.params).toEqual({ x: '1' });
    expect(router.find(req('http://a/b/2'))?.result.params).toEqual({ y: '2' });
  });
});

describe('compile — opaque fallbacks', () => {
  it('runs custom() predicates for routes with no path part', () => {
    const routes: Route<unknown>[] = [
      { match: p('/home'), render: () => 'home' },
      {
        match: custom<{ role: string }>((r) => (r.url.includes('/admin') ? { role: 'admin' } : null)),
        render: () => 'opaque',
      },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/home'))?.route.render(null as never)).toBe('home');
    const hit = router.find(req('http://a/admin/users'));
    expect(hit?.route.render(null as never)).toBe('opaque');
    expect(hit?.result.params).toEqual({ role: 'admin' });
  });
});

describe('compile — redirects', () => {
  it('follows string redirects', () => {
    const routes: Route<unknown>[] = [
      { match: p('/old'), redirect: '/new', render: () => null },
      { match: p('/new'), render: () => 'new' },
    ];
    const router = compile(routes);
    expect(router.find(req('http://a/old'))?.route.render(null as never)).toBe('new');
  });

  it('follows function redirects and preserves origin', () => {
    const routes: Route<unknown>[] = [
      {
        match: p('/users/:id'),
        redirect: ({ params }) => `/u/${(params as { id: string }).id}`,
        render: () => null,
      },
      { match: p('/u/:id'), render: () => 'short' },
    ];
    const router = compile(routes);
    const hit = router.find(req('http://host.example/users/42'));
    expect(hit?.route.render(null as never)).toBe('short');
    expect(hit?.result.location.pathname).toBe('/u/42');
  });

  it('throws on redirect cycles beyond depth 10', () => {
    const routes: Route<unknown>[] = [
      { match: p('/a'), redirect: '/b', render: () => null },
      { match: p('/b'), redirect: '/a', render: () => null },
    ];
    const router = compile(routes);
    expect(() => router.find(req('http://a/a'))).toThrow(/depth 10/);
  });
});

describe('compile — parity with findRoute on realistic shapes', () => {
  it('picks the same route for static/param/miss across a medium table', () => {
    const routes: Route<unknown>[] = [];
    for (let i = 0; i < 50; i++) {
      routes.push({ match: p(`/page-${i}`), render: () => `page-${i}` });
    }
    routes.push({ match: p('/users/:id'), render: () => 'user' });
    routes.push({ match: p('/orgs/:o/repos/:r'), render: () => 'repo' });
    routes.push({ match: p('/**'), render: () => 'fallback' });

    const router = compile(routes);

    expect(router.find(req('http://a/page-0'))?.route.render(null as never)).toBe('page-0');
    expect(router.find(req('http://a/page-27'))?.route.render(null as never)).toBe('page-27');
    expect(router.find(req('http://a/users/42'))?.result.params).toEqual({ id: '42' });
    expect(router.find(req('http://a/orgs/acme/repos/core'))?.result.params).toEqual({
      o: 'acme',
      r: 'core',
    });
    expect(router.find(req('http://a/no/such/thing'))?.route.render(null as never)).toBe(
      'fallback',
    );
  });
});
