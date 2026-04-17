import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Link, Router, useLocation, useParams, useRoute } from './index.tsx';
import type { Route } from 'buttermilk';
import { p } from 'buttermilk';

const routes: Route<unknown>[] = [
  { match: p('/'), render: () => <div data-testid="view">home</div> },
  {
    match: p('/users/:id'),
    render: ({ params }) => (
      <div data-testid="view">user {(params as { id: string }).id}</div>
    ),
  },
  {
    match: p('/search'),
    render: () => {
      const loc = useLocation();
      return <div data-testid="view">search q={loc.query.q ?? ''}</div>;
    },
  },
  { match: p('/**'), render: () => <div data-testid="view">404</div> },
];

describe('<Router>', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('renders the matched route', () => {
    window.history.replaceState({}, '', '/users/42');
    render(<Router routes={routes} />);
    expect(screen.getByTestId('view').textContent).toBe('user 42');
  });

  it('renders controlled url for SSR', () => {
    render(<Router routes={routes} url="http://x/users/7" />);
    expect(screen.getByTestId('view').textContent).toBe('user 7');
  });

  it('falls through to the catch-all on miss', () => {
    window.history.replaceState({}, '', '/no-such');
    render(<Router routes={routes} />);
    expect(screen.getByTestId('view').textContent).toBe('404');
  });

  it('<Link> navigates without a full reload', () => {
    window.history.replaceState({}, '', '/');
    render(
      <Router routes={routes}>
        <Link href="/users/99" data-testid="link">go</Link>
      </Router>,
    );
    expect(screen.getByTestId('view').textContent).toBe('home');
    act(() => {
      fireEvent.click(screen.getByTestId('link'));
    });
    expect(screen.getByTestId('view').textContent).toBe('user 99');
    expect(window.location.pathname).toBe('/users/99');
  });

  it('<Link> lets modifier-clicks fall through', () => {
    window.history.replaceState({}, '', '/');
    render(
      <Router routes={routes}>
        <Link href="/users/99" data-testid="link">go</Link>
      </Router>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId('link'), { metaKey: true });
    });
    // Modifier click: browser handles it; router should not navigate.
    expect(window.location.pathname).toBe('/');
    expect(screen.getByTestId('view').textContent).toBe('home');
  });

  it('reacts to popstate', () => {
    window.history.replaceState({}, '', '/');
    render(<Router routes={routes} />);
    expect(screen.getByTestId('view').textContent).toBe('home');
    act(() => {
      window.history.pushState({}, '', '/users/5');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByTestId('view').textContent).toBe('user 5');
  });

  it('useParams / useLocation surface the match', () => {
    window.history.replaceState({}, '', '/users/10');
    function Probe() {
      const route = useRoute<{ id: string }>();
      const params = useParams<{ id: string }>();
      return (
        <span data-testid="probe">
          {route ? `got ${params.id}` : 'none'}
        </span>
      );
    }
    const routesWithProbe: Route<unknown>[] = [
      { match: p('/users/:id'), render: () => <Probe /> },
      { match: p('/**'), render: () => <Probe /> },
    ];
    render(<Router routes={routesWithProbe} />);
    expect(screen.getByTestId('probe').textContent).toBe('got 10');
  });

  it('search query is visible through useLocation', () => {
    window.history.replaceState({}, '', '/search?q=apples');
    render(<Router routes={routes} />);
    expect(screen.getByTestId('view').textContent).toBe('search q=apples');
  });
});
