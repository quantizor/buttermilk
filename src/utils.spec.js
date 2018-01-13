import { match, valid } from './utils';

describe('valid(Function|RegExp, String)', () => {
    it('handles a given regex', () => {
        expect(valid(/.*/, 'foo')).toBe(true);
        expect(valid(/bar/, 'foo')).toBe(false);
    });

    it('handles a given function', () => {
        expect(valid(() => true, 'foo')).toBe(true);
        expect(valid(() => false, 'foo')).toBe(false);
    });
});

describe('match(Object[], String)', () => {
    const routes = [
        { test: /foo/ },
        { test: /bar/ },
        { test: /baz/, redirect: '/bar' },
    ];

    it('returns the correct route', () => {
        expect(match(routes, '/foo')).toBe(routes[0]);
    });

    it('returns nothing if a route is not found', () => {
        expect(match(routes, '/fizz')).toBeUndefined();
    });

    it('handles redirects if the matched route contains one', () => {
        expect(match(routes, '/baz')).toBe(routes[1]);
    });
});
