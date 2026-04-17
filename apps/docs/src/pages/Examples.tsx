import { useMemo, useState } from 'react';
import {
  and,
  compile,
  findRoute,
  guard,
  or,
  path,
  predicate,
  query,
  regex,
  type MatchResult,
  type Predicate,
  type Route,
} from 'buttermilk';
import { useLocation, useRoute } from 'buttermilk-react';
import { useDocumentHead } from '../useDocumentHead.ts';

export function Examples() {
  useDocumentHead({
    title: 'Examples — buttermilk',
    description:
      'Interactive examples for every buttermilk feature: path patterns, wildcards, regex, query, guard, predicates, composition, redirects, the radix compiler, and React 19 hooks.',
  });

  return (
    <div className="doc">
      <aside className="doc__toc" aria-label="Feature index">
        <h2 className="doc__toc-title">Features</h2>
        <ul>
          <li><a href="#path">Path patterns</a></li>
          <li><a href="#wildcards">Wildcards</a></li>
          <li><a href="#regex">RegExp</a></li>
          <li><a href="#query">Query</a></li>
          <li><a href="#guard">Guard</a></li>
          <li><a href="#predicate">Predicate (escape hatch)</a></li>
          <li><a href="#and">and()</a></li>
          <li><a href="#or">or()</a></li>
          <li><a href="#redirect">Redirects</a></li>
          <li><a href="#compile">compile() vs findRoute()</a></li>
          <li><a href="#react">React hooks</a></li>
        </ul>
      </aside>
      <main className="doc__content">
        <h1>Examples</h1>
        <p>Every section below is live. Edit the URL and watch the match change.</p>

        <Section
          id="path"
          title="Path patterns — path()"
          blurb=":name captures one non-empty segment. Multiple params compose."
          code={`path('/')
path('/users/:id')
path('/users/:id/posts/:postId')`}
          predicates={[path('/'), path('/users/:id'), path('/users/:id/posts/:postId')]}
          initial="/users/42/posts/7"
        />

        <Section
          id="wildcards"
          title="Wildcards — * and **"
          blurb="* matches exactly one segment (no capture). ** matches the remainder and captures it as params['*']."
          code={`path('/docs/*')       // /docs/intro ✓   /docs/a/b ✗
path('/docs/**')      // /docs/a/b/c ✓  captures '*' = 'a/b/c'`}
          predicates={[path('/docs/*'), path('/docs/**')]}
          initial="/docs/guide/routing/intro"
        />

        <Section
          id="regex"
          title="RegExp — regex()"
          blurb="Named capture groups become params."
          code={`regex(/^\\/files\\/(?<year>\\d{4})-(?<month>\\d{2})\\.pdf$/)`}
          predicates={[regex(/^\/files\/(?<year>\d{4})-(?<month>\d{2})\.pdf$/)]}
          initial="/files/2026-04.pdf"
        />

        <Section
          id="query"
          title="Query — query()"
          blurb="Requires the given key in the query string. The matched value becomes a typed param."
          code={`query('q')`}
          predicates={[query('q')]}
          initial="/search?q=router"
        />

        <Section
          id="guard"
          title="Guard — guard()"
          blurb="A predicate that contributes no params. Useful for auth, feature flags, header checks."
          code={`guard((req) => req.headers?.['x-role'] === 'staff')`}
          predicates={[guard((req) => req.headers?.['x-role'] === 'staff')]}
          initial="/admin"
          headers={{ 'x-role': 'staff' }}
          withHeaderEditor
        />

        <Section
          id="predicate"
          title="Escape hatch — predicate()"
          blurb="Returns typed params directly. Use when no built-in predicate fits."
          code={`predicate<{ invoice: string }>((req) => {
  const m = req.url.match(/\\/invoices\\/(INV-\\d+)/);
  return m?.[1] ? { invoice: m[1] } : null;
})`}
          predicates={[
            predicate<{ invoice: string }>((req) => {
              const m = req.url.match(/\/invoices\/(INV-\d+)/);
              return m && m[1] ? { invoice: m[1] } : null;
            }),
          ]}
          initial="/invoices/INV-42"
        />

        <Section
          id="and"
          title="Composition — and()"
          blurb="Both predicates must match. Param types intersect."
          code={`and(path('/search'), query('q'))`}
          predicates={[and(path('/search'), query('q'))]}
          initial="/search?q=router"
        />

        <Section
          id="or"
          title="Composition — or()"
          blurb="First predicate that matches wins. Param types union."
          code={`or(path('/user/:id'), path('/u/:id'))`}
          predicates={[or(path('/user/:id'), path('/u/:id'))]}
          initial="/u/42"
        />

        <RedirectSection />

        <Section
          id="compile"
          title="Matcher: findRoute() vs compile()"
          blurb="Both return the same result. compile() builds a radix tree for sub-microsecond dispatch; findRoute() is the linear oracle."
          code={`import { findRoute, compile } from 'buttermilk';

const router = compile(routes);
const a = findRoute(routes, { url });
const b = router.find({ url });
// a and b agree on every URL the trie can handle.`}
          predicates={[path('/users/:id'), path('/posts/:slug'), path('/**')]}
          initial="/users/42"
          compareCompile
        />

        <ReactSection />
      </main>
    </div>
  );
}

interface SectionProps {
  id: string;
  title: string;
  blurb: string;
  code: string;
  predicates: ReadonlyArray<Predicate<unknown>>;
  initial?: string;
  headers?: Record<string, string>;
  withHeaderEditor?: boolean;
  compareCompile?: boolean;
}

function Section({
  id,
  title,
  blurb,
  code,
  predicates,
  initial = '/',
  headers,
  withHeaderEditor,
  compareCompile,
}: SectionProps) {
  return (
    <section id={id} className="ex">
      <h2>{title}</h2>
      <p>{blurb}</p>
      <pre><code>{code}</code></pre>
      {compareCompile ? (
        <CompareCompile predicates={predicates} initial={initial} />
      ) : (
        <LiveMatch
          predicates={predicates}
          initial={initial}
          initialHeaders={headers}
          withHeaderEditor={withHeaderEditor}
        />
      )}
    </section>
  );
}

function LiveMatch({
  predicates,
  initial,
  initialHeaders,
  withHeaderEditor,
}: {
  predicates: ReadonlyArray<Predicate<unknown>>;
  initial: string;
  initialHeaders?: Record<string, string>;
  withHeaderEditor?: boolean;
}) {
  const [url, setUrl] = useState(initial);
  const [headerJson, setHeaderJson] = useState(
    initialHeaders ? JSON.stringify(initialHeaders, null, 2) : '',
  );

  const headers = useMemo(() => {
    if (!headerJson.trim()) return undefined;
    try {
      return JSON.parse(headerJson) as Record<string, string>;
    } catch {
      return undefined;
    }
  }, [headerJson]);

  const routes: ReadonlyArray<Route<unknown>> = useMemo(
    () => predicates.map((match, i) => ({ match, render: () => `route[${i}]` })),
    [predicates],
  );

  const hit = useMemo(() => findRoute(routes, { url, headers }), [routes, url, headers]);

  return (
    <div className="ex__live">
      <label className="ex__field">
        <span>URL</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
      </label>
      {withHeaderEditor ? (
        <label className="ex__field">
          <span>Headers (JSON)</span>
          <textarea
            value={headerJson}
            onChange={(e) => setHeaderJson(e.target.value)}
            rows={3}
            spellCheck={false}
          />
        </label>
      ) : null}
      <pre className="ex__result">
        <code>{formatMatch(hit, routes)}</code>
      </pre>
    </div>
  );
}

function CompareCompile({
  predicates,
  initial,
}: {
  predicates: ReadonlyArray<Predicate<unknown>>;
  initial: string;
}) {
  const [url, setUrl] = useState(initial);

  const routes: ReadonlyArray<Route<unknown>> = useMemo(
    () => predicates.map((match, i) => ({ match, render: () => `route[${i}]` })),
    [predicates],
  );

  const router = useMemo(() => compile(routes), [routes]);
  const linear = useMemo(() => findRoute(routes, { url }), [routes, url]);
  const compiled = useMemo(() => router.find({ url }), [router, url]);

  return (
    <div className="ex__live">
      <label className="ex__field">
        <span>URL</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
      </label>
      <div className="ex__side">
        <div>
          <h4>findRoute()</h4>
          <pre className="ex__result"><code>{formatMatch(linear, routes)}</code></pre>
        </div>
        <div>
          <h4>compile().find()</h4>
          <pre className="ex__result"><code>{formatMatch(compiled, routes)}</code></pre>
        </div>
      </div>
    </div>
  );
}

function RedirectSection() {
  const routes = useMemo<ReadonlyArray<Route<unknown>>>(
    () => [
      {
        match: path('/u/:id'),
        redirect: (ctx: MatchResult<unknown>) =>
          `/users/${(ctx.params as { id: string }).id}`,
        render: () => null,
      },
      { match: path('/users/:id'), render: () => 'User page' },
    ],
    [],
  );

  const [url, setUrl] = useState('/u/42');
  const hit = useMemo(() => findRoute(routes, { url }), [routes, url]);

  const redirectTarget =
    hit?.route.redirect != null
      ? typeof hit.route.redirect === 'function'
        ? hit.route.redirect(hit.result)
        : hit.route.redirect
      : null;

  return (
    <section id="redirect" className="ex">
      <h2>Redirects</h2>
      <p>Static string or function. The function receives the match result.</p>
      <pre><code>{`{ match: path('/u/:id'),
  redirect: ({ params }) => \`/users/\${params.id}\`,
  render: () => null }`}</code></pre>
      <div className="ex__live">
        <label className="ex__field">
          <span>URL</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
        </label>
        <pre className="ex__result">
          <code>
            {hit == null
              ? 'no match'
              : redirectTarget
                ? `redirect → ${redirectTarget}`
                : `matched /users/:id with id=${(hit.result.params as { id: string }).id}`}
          </code>
        </pre>
      </div>
    </section>
  );
}

function ReactSection() {
  return (
    <section id="react" className="ex">
      <h2>React hooks</h2>
      <p>Every hook requires a &lt;Router&gt; ancestor. This page is inside one — below are the live values for this route.</p>
      <pre><code>{`import { useLocation, useRoute, useRouter } from 'buttermilk-react';

function Widget() {
  const { pathname, search } = useLocation();
  const route = useRoute();
  const { navigate } = useRouter();
}`}</code></pre>
      <LiveRouterInspector />
    </section>
  );
}

function LiveRouterInspector() {
  const loc = useLocation();
  const route = useRoute();
  return (
    <pre className="ex__result">
      <code>
        {JSON.stringify(
          {
            pathname: loc.pathname,
            search: loc.search,
            hash: loc.hash,
            params: route?.params ?? null,
          },
          null,
          2,
        )}
      </code>
    </pre>
  );
}

function formatMatch(
  hit: { route: Route<unknown>; result: MatchResult<unknown> } | null,
  routes: ReadonlyArray<Route<unknown>>,
): string {
  if (!hit) return 'no match';
  const idx = routes.indexOf(hit.route);
  return JSON.stringify(
    {
      matched: `route[${idx}]`,
      params: hit.result.params,
      pathname: hit.result.location.pathname,
      search: hit.result.location.search,
    },
    null,
    2,
  );
}
