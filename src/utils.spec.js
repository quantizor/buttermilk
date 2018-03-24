import * as utils from './utils';
import regexify from './regexify';

describe('valid(Function|RegExp, URLString)', () => {
    it('handles a given regex', () => {
        expect(utils.valid(/.*/, 'foo')).toBe(true);
        expect(utils.valid(/bar/, 'foo')).toBe(false);
    });

    it('handles a given function', () => {
        expect(utils.valid(() => true, 'foo')).toBe(true);
        expect(utils.valid(() => false, 'foo')).toBe(false);
    });
});

describe('findRoute(Object[], URLString)', () => {
    let routes;

    beforeEach(() => {
        routes = [
            { test: /foo/ },
            { test: /bar/ },
            { test: /baz/, redirect: '/bar' },
        ];
    });

    it('returns the correct route', () => {
        expect(utils.findRoute(routes, '/foo')).toEqual({ route: routes[0], url: '/foo' });
    });

    it('throws if a route is not found', () => {
        expect(() => utils.findRoute(routes, '/fizz')).toThrowError();
    });

    it('handles redirects if the matched route contains one', () => {
        expect(utils.findRoute(routes, '/baz')).toEqual({ route: routes[1], url: '/bar' });
    });

    it('returns the wildcard route if no other routes match', () => {
        routes.push({ test: regexify('*') });

        expect(utils.findRoute(routes, '/fizz')).toEqual({ route: routes[3], url: '/fizz' });
    });
});

describe('extractParamsFromPath(URLString)', () => {
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

describe('parseUrl(URLString)', () => {
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

describe('getRouteParamsForURL(Object, URLString)', () => {
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
