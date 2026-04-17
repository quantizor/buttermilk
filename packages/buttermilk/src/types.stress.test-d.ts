// Type stress tests — verify ExtractParams / ParamsOf don't regress under:
//   - deep path nesting
//   - dense :param lists
//   - heavy and/or composition
//
// Regressions here mean either "types got slower" (tsc hangs) or "types got
// wrong" (an assertion below fails). Both matter for DX at scale.
//
// Separate from `predicates.test-d.ts` which documents the basic combinators.

import { expectTypeOf, test } from 'vitest';
import { and, or, p, query } from './predicates.ts';
import type { ExtractParams, ParamsOf } from './types.ts';

// --- ExtractParams scaling ----------------------------------------------

test('ExtractParams — no params', () => {
  expectTypeOf<ExtractParams<'/'>>().toEqualTypeOf<Record<never, never>>();
  expectTypeOf<ExtractParams<'/a/b/c/d/e/f/g/h/i/j'>>().toEqualTypeOf<Record<never, never>>();
});

test('ExtractParams — dense :params at depth 10', () => {
  type P = ExtractParams<'/:a/:b/:c/:d/:e/:f/:g/:h/:i/:j'>;
  expectTypeOf<P>().toMatchTypeOf<{
    readonly a: string;
    readonly b: string;
    readonly c: string;
    readonly d: string;
    readonly e: string;
    readonly f: string;
    readonly g: string;
    readonly h: string;
    readonly i: string;
    readonly j: string;
  }>();
});

test('ExtractParams — mixed static/param alternation', () => {
  type P = ExtractParams<'/orgs/:o/repos/:r/pulls/:n/comments/:c'>;
  expectTypeOf<P>().toMatchTypeOf<{
    readonly o: string;
    readonly r: string;
    readonly n: string;
    readonly c: string;
  }>();
});

test('ExtractParams — params survive trailing wildcards and statics', () => {
  type P = ExtractParams<'/users/:id/posts/*'>;
  expectTypeOf<P>().toMatchTypeOf<{ readonly id: string }>();

  type Q = ExtractParams<'/files/:name/**'>;
  expectTypeOf<Q>().toMatchTypeOf<{ readonly name: string }>();
});

// --- ParamsOf under composition ----------------------------------------

test('ParamsOf — deeply nested and()', () => {
  const pred = and(
    and(p('/a/:a'), query('q1')),
    and(and(p('/b/:b' as const), query('q2')), query('q3')),
  );
  type P = ParamsOf<typeof pred>;
  // Params from both path parts AND all three queries are all present.
  expectTypeOf<P>().toMatchTypeOf<{
    readonly a: string;
    readonly b: string;
    readonly q1: string;
    readonly q2: string;
    readonly q3: string;
  }>();
});

test('ParamsOf — or() distributes under and()', () => {
  const pred = and(or(p('/users/:id'), p('/u/:id')), query('tab'));
  type P = ParamsOf<typeof pred>;
  // Both branches share `id`; `tab` unconditional.
  expectTypeOf<P>().toMatchTypeOf<{ readonly id: string; readonly tab: string }>();
});

test('ParamsOf — wide or() with different param names', () => {
  const pred = or(
    or(p('/a/:a'), p('/b/:b')),
    or(p('/c/:c'), p('/d/:d')),
  );
  type P = ParamsOf<typeof pred>;
  type Want =
    | { readonly a: string }
    | { readonly b: string }
    | { readonly c: string }
    | { readonly d: string };
  expectTypeOf<P>().toMatchTypeOf<Want>();
  expectTypeOf<Want>().toMatchTypeOf<P>();
});

// --- Pathological shapes -----------------------------------------------

test('ExtractParams — no hang on longish literal (depth 15)', () => {
  type P =
    ExtractParams<'/:p1/:p2/:p3/:p4/:p5/:p6/:p7/:p8/:p9/:p10/:p11/:p12/:p13/:p14/:p15'>;
  // We don't assert every key — just prove the type resolves to *something*
  // non-never without timing out.
  expectTypeOf<P>().not.toBeNever();
});

test('ParamsOf — chain of 8 and()s', () => {
  const pred = and(
    and(
      and(p('/:a'), query('q1')),
      and(p('/:b' as const), query('q2')),
    ),
    and(
      and(p('/:c' as const), query('q3')),
      and(p('/:d' as const), query('q4')),
    ),
  );
  type P = ParamsOf<typeof pred>;
  expectTypeOf<P>().toMatchTypeOf<{
    readonly q1: string;
    readonly q2: string;
    readonly q3: string;
    readonly q4: string;
  }>();
});
