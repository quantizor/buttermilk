import { expectTypeOf, test } from 'vitest';
import { and, custom, guard, or, p, query, regex } from './predicates.ts';
import type { ParamsOf } from './types.ts';

test('p() infers params from literal path', () => {
  const root = p('/');
  expectTypeOf<ParamsOf<typeof root>>().toEqualTypeOf<Readonly<Record<never, never>>>();

  const oneParam = p('/users/:id');
  expectTypeOf<ParamsOf<typeof oneParam>>().toEqualTypeOf<{ readonly id: string }>();

  const twoParams = p('/orgs/:orgId/repos/:repoId');
  expectTypeOf<ParamsOf<typeof twoParams>>().toEqualTypeOf<{
    readonly orgId: string;
  } & { readonly repoId: string }>();
});

test('query() produces a keyed record', () => {
  const q = query('tab');
  expectTypeOf<ParamsOf<typeof q>>().toEqualTypeOf<{ readonly tab: string }>();
});

test('guard() contributes no params', () => {
  const g = guard(() => true);
  expectTypeOf<ParamsOf<typeof g>>().toEqualTypeOf<Readonly<Record<never, never>>>();
});

test('custom() carries the user type through', () => {
  type Ctx = { userId: string; role: 'admin' | 'user' };
  const c = custom<Ctx>(() => null);
  expectTypeOf<ParamsOf<typeof c>>().toEqualTypeOf<Ctx>();
});

test('and() intersects params', () => {
  const combined = and(p('/users/:id'), query('tab'));
  expectTypeOf<ParamsOf<typeof combined>>().toEqualTypeOf<
    { readonly id: string } & { readonly tab: string }
  >();
});

test('or() unions params', () => {
  const either = or(p('/admin/:id'), p('/owner/:ownerId'));
  expectTypeOf<ParamsOf<typeof either>>().toEqualTypeOf<
    { readonly id: string } | { readonly ownerId: string }
  >();
});

test('regex() takes explicit params', () => {
  const r = regex<{ slug: string }>(/^\/posts\/(?<slug>[a-z-]+)$/);
  expectTypeOf<ParamsOf<typeof r>>().toEqualTypeOf<{ slug: string }>();
});

test('nested and/or compose (bidirectional assignability)', () => {
  const nested = and(or(p('/a/:x'), p('/b/:y')), query('flag'));
  type Got = ParamsOf<typeof nested>;
  type Want =
    | ({ readonly x: string } & { readonly flag: string })
    | ({ readonly y: string } & { readonly flag: string });
  // Distributive intersection expansion — equivalent to
  //   ({ x } | { y }) & { flag }
  // which TS narrows the same way at use sites.
  expectTypeOf<Got>().toMatchTypeOf<Want>();
  expectTypeOf<Want>().toMatchTypeOf<Got>();
});
