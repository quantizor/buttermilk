// Shared benchmark fixtures.
//
// We want consistent route shapes across competitors so the comparison is
// apples-to-apples. All adapters translate these generic descriptors into
// their native route config.

export type RouteShape =
  | { kind: 'static'; path: string }
  | { kind: 'param'; path: string; paramNames: string[] }
  | { kind: 'catchall'; path: '*' };

export type Scenario = {
  name: string;
  routes: RouteShape[];
  /** URLs the bench will exercise, chosen to cover hit/miss paths. */
  urls: { label: string; url: string }[];
};

const STATIC_PATHS = [
  '/',
  '/about',
  '/contact',
  '/pricing',
  '/blog',
  '/docs',
  '/login',
  '/signup',
  '/settings',
  '/dashboard',
];

const PARAM_SEGMENTS = ['users', 'posts', 'orgs', 'projects', 'teams', 'files'];

function pad(n: number): string {
  return String(n).padStart(4, '0');
}

function genRoutes(count: number): RouteShape[] {
  const routes: RouteShape[] = [];

  // 40% static, 40% single-param, 20% multi-param
  const staticCount = Math.floor(count * 0.4);
  const singleParamCount = Math.floor(count * 0.4);
  const multiParamCount = count - staticCount - singleParamCount;

  for (let i = 0; i < staticCount; i++) {
    const base = STATIC_PATHS[i % STATIC_PATHS.length]!;
    const suffix = i >= STATIC_PATHS.length ? `/v${pad(i)}` : '';
    routes.push({ kind: 'static', path: `${base}${suffix}` });
  }

  for (let i = 0; i < singleParamCount; i++) {
    const seg = PARAM_SEGMENTS[i % PARAM_SEGMENTS.length]!;
    routes.push({
      kind: 'param',
      path: `/${seg}-${pad(i)}/:id`,
      paramNames: ['id'],
    });
  }

  for (let i = 0; i < multiParamCount; i++) {
    const a = PARAM_SEGMENTS[i % PARAM_SEGMENTS.length]!;
    const b = PARAM_SEGMENTS[(i + 1) % PARAM_SEGMENTS.length]!;
    routes.push({
      kind: 'param',
      path: `/${a}-${pad(i)}/:aId/${b}/:bId`,
      paramNames: ['aId', 'bId'],
    });
  }

  routes.push({ kind: 'catchall', path: '*' });
  return routes;
}

export function makeScenarios(): Scenario[] {
  return [10, 100, 1000].map((count) => {
    const routes = genRoutes(count);
    // Pick a few URLs that exercise different parts of the table.
    const firstStatic = routes.find((r) => r.kind === 'static')!.path;
    const midStatic = routes[Math.floor(count / 2)]!.kind === 'static'
      ? (routes[Math.floor(count / 2)] as { path: string }).path
      : firstStatic;
    const firstParamRoute = routes.find((r) => r.kind === 'param')!;
    const firstParamUrl = firstParamRoute.path.replace(':id', '42').replace(':aId', '7').replace(':bId', '99');

    return {
      name: `${count}-routes`,
      routes,
      urls: [
        { label: 'static-hit-first', url: firstStatic },
        { label: 'static-hit-middle', url: midStatic },
        { label: 'param-hit', url: firstParamUrl },
        { label: 'miss-fallback', url: '/definitely-not-a-route-' + pad(count) },
      ],
    };
  });
}
