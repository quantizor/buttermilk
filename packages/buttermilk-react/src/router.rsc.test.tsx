// @vitest-environment node

// Simulates React's `react-server` condition by zeroing out the stateful
// hooks and `createContext` on the mocked `react` module. Under that
// shape, router.tsx must pick the server branch at load time and render
// synchronously from the `url` prop. `useRef` is the single signal the
// module actually probes; the rest are cleared for realism.

import { describe, expect, it, vi } from 'vitest';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  const mocked: Record<string, unknown> = { ...actual };
  for (const key of [
    'useSyncExternalStore',
    'createContext',
    'useContext',
    'useState',
    'useReducer',
    'useEffect',
    'useLayoutEffect',
    'useInsertionEffect',
    'useRef',
    'useTransition',
    'useDeferredValue',
    'useImperativeHandle',
    'startTransition',
  ]) {
    mocked[key] = undefined;
  }
  return mocked;
});

const { Router } = await import('./router.tsx');
const { Link } = await import('./link.tsx');
const { useParams, useRoute, useLocation, useNavigate } = await import('./hooks.ts');
const { path } = await import('buttermilk');
const { renderToStaticMarkup } = await import('react-dom/server');

describe('<Router> under react-server condition', () => {
  const routes = [
    { match: path('/'), render: () => 'home' as unknown },
    {
      match: path('/users/:id'),
      render: ({ params }: { params: unknown }) =>
        `user ${(params as { id: string }).id}`,
    },
    { match: path('/**'), render: () => '404' as unknown },
  ];

  it('renders the matched route with a controlled url', () => {
    const html = renderToStaticMarkup(
      <Router routes={routes} url="/users/42" />,
    );
    expect(html).toBe('user 42');
  });

  it('falls through to the catch-all on miss', () => {
    const html = renderToStaticMarkup(
      <Router routes={routes} url="/nope/deep/path" />,
    );
    expect(html).toBe('404');
  });

  it('throws a teaching error when url is omitted', () => {
    expect(() =>
      renderToStaticMarkup(<Router routes={routes} />),
    ).toThrow(/<Router url=.+> is required in Server Components/);
  });
});

describe('<Link> under react-server condition', () => {
  it('renders a plain <a href> with no onclick handler', () => {
    const html = renderToStaticMarkup(<Link href="/go">go</Link>);
    expect(html).toBe('<a href="/go">go</a>');
  });
});

describe('hooks under react-server condition', () => {
  it('useRoute / useParams / useLocation / useNavigate throw a teaching error', () => {
    for (const fn of [useRoute, useParams, useLocation, useNavigate]) {
      expect(() => fn()).toThrow(/Client Component/);
    }
  });
});
