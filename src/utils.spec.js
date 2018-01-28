import * as utils from './utils';
import regexify from './regexify';

describe('valid(Function|RegExp, String)', () => {
    it('handles a given regex', () => {
        expect(utils.valid(/.*/, 'foo')).toBe(true);
        expect(utils.valid(/bar/, 'foo')).toBe(false);
    });

    it('handles a given function', () => {
        expect(utils.valid(() => true, 'foo')).toBe(true);
        expect(utils.valid(() => false, 'foo')).toBe(false);
    });
});

describe('match(Object[], String)', () => {
    const routes = [
        { test: /foo/ },
        { test: /bar/ },
        { test: /baz/, redirect: '/bar' },
    ];

    it('returns the correct route', () => {
        expect(utils.match(routes, '/foo')).toBe(routes[0]);
    });

    it('returns nothing if a route is not found', () => {
        expect(utils.match(routes, '/fizz')).toBeUndefined();
    });

    it('handles redirects if the matched route contains one', () => {
        expect(utils.match(routes, '/baz')).toBe(routes[1]);
    });
});

describe('extractParamsFromPath(String)', () => {
    it('returns an array of params', () => {
        expect(utils.extractParamsFromPath('/:foo/:bar')).toEqual(
            expect.arrayContaining([
                'foo',
                'bar',
            ])
        );
    });

    it('handles optional params', () => {
        expect(utils.extractParamsFromPath('/:foo(/:bar)')).toEqual(
            expect.arrayContaining([
                'foo',
                'bar',
            ])
        );
    });

    it('returns an empty array if no params are present', () => {
        expect(utils.extractParamsFromPath('/foo/bar')).toEqual([]);
    });
});

describe('parseUrl(String)', () => {
    expect(
        utils.parseUrl('https://evan:password@google.com:8080/yar?foo=bar&yah=nah#nah')
    ).toMatchObject({
        hash: '#nah',
        host: 'google.com:8080',
        hostname: 'google.com',
        href: 'https://evan:password@google.com:8080/yar?foo=bar&yah=nah#nah',
        origin: 'https://evan:password@google.com:8080',
        password: 'password',
        pathname: '/yar',
        port: '8080',
        protocol: 'https:',
        query: {
            foo: 'bar',
            yah: 'nah',
        },
        search: '?foo=bar&yah=nah',
        username: 'evan',
    });
});

describe('getRouteParamsForURL(Object, String)', () => {
    it('returns an empty object if the route has no params', () => {
        expect(utils.getRouteParamsForURL({ params: [] }, '/foo')).toEqual({});
    });

    it('returns a hash of the route params', () => {
        const path = '/foo(/:bar)/:baz';

        expect(
            utils.getRouteParamsForURL({
                params: utils.extractParamsFromPath(path),
                test: regexify(path),
            }, '/foo/baz/buzz')
        ).toMatchObject({
            bar: 'baz',
            baz: 'buzz',
        });
    });

    it('handles missing optional fragments', () => {
        const path = '/foo(/:bar)/:baz';

        expect(
            utils.getRouteParamsForURL({
                params: utils.extractParamsFromPath(path),
                test: regexify(path),
            }, '/foo/buzz')
        ).toMatchObject({
            baz: 'buzz',
        });
    });
});
