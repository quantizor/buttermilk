import { describe, expect, it } from 'vitest';
import { custom, p, path, predicate } from './index.ts';

describe('aliases', () => {
  it('`path` is the same implementation as `p`', () => {
    expect(path).toBe(p);
    const pred = path('/users/:id');
    expect(pred).toEqual({ tag: 'path', pattern: '/users/:id' });
  });

  it('`predicate` is the same implementation as `custom`', () => {
    expect(predicate).toBe(custom);
    const pred = predicate<{ v: number }>(() => ({ v: 1 }));
    expect(pred.tag).toBe('opaque');
  });
});

describe('path() validation', () => {
  it('allows valid patterns', () => {
    expect(() => path('/')).not.toThrow();
    expect(() => path('/users/:id')).not.toThrow();
    expect(() => path('/orgs/:org/repos/:repo')).not.toThrow();
    expect(() => path('/docs/**')).not.toThrow();
    expect(() => path('/a/*/b')).not.toThrow();
    expect(() => path('**')).not.toThrow();
  });

  it('rejects `**` that is not the final segment', () => {
    expect(() => path('/**/foo')).toThrowError(
      /must be the final segment.*Got '\/\*\*\/foo'/,
    );
    expect(() => path('/a/**/b')).toThrowError(/must be the final segment/);
  });

  it('rejects `**` glued to other characters', () => {
    expect(() => path('/foo**')).toThrowError(/must be a standalone segment/);
    expect(() => path('/**foo')).toThrowError(/must be a standalone segment/);
  });

  it('rejects duplicate param names', () => {
    expect(() => path('/users/:id/posts/:id')).toThrowError(
      /duplicate param name ':id' in '\/users\/:id\/posts\/:id'/,
    );
  });

  it('rejects empty param names', () => {
    expect(() => path('/users/:')).toThrowError(/empty param name/);
    expect(() => path('/:/foo')).toThrowError(/empty param name/);
  });

  it('teaches the fix in the error message', () => {
    try {
      path('/**/foo');
      throw new Error('should have thrown');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("buttermilk:");
      expect(msg).toContain('/**/foo');
      expect(msg).toMatch(/move.*to the end|Move.*to the end/i);
    }
  });
});
