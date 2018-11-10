import * as utils from './utils';
import regexify from './regexify';

describe('valid(Function|RegExp, URLString)', () => {
  it('handles a given regex', () => {
    expect(utils.valid(/.*/, 'https://fizz.com/foo')).toBe(true);
    expect(utils.valid(/bar/, 'https://fizz.com/foo')).toBe(false);
  });

  it('handles a given function', () => {
    expect(utils.valid(() => true, 'https://fizz.com/foo')).toBe(true);
    expect(utils.valid(() => false, 'https://fizz.com/foo')).toBe(false);
  });
});

describe('findRoute(Object[], URLString)', () => {
  let routes;

  beforeEach(() => {
    routes = [{ test: /foo/ }, { test: /bar/ }, { test: /baz/, redirect: '/bar' }];
  });

  it('returns the correct route', () => {
    expect(utils.findRoute(routes, 'https://fizz.com/foo')).toEqual({
      route: routes[0],
      url: 'https://fizz.com/foo',
    });
  });

  it('throws if a route is not found', () => {
    expect(() => utils.findRoute(routes, 'https://fizz.com/fizz')).toThrowError();
  });

  it('handles redirects if the matched route contains one', () => {
    expect(utils.findRoute(routes, 'https://fizz.com/baz')).toEqual({
      route: routes[1],
      url: 'https://fizz.com/bar',
    });
  });

  it('returns the wildcard route if no other routes match', () => {
    routes.push({ test: regexify('*') });

    expect(utils.findRoute(routes, 'https://fizz.com/fizz')).toEqual({
      route: routes[3],
      url: 'https://fizz.com/fizz',
    });
  });
});

describe('extractParamsFromPath(URLString)', () => {
  it('returns an array of params', () => {
    expect(utils.extractParamsFromPath('/:foo/:bar')).toEqual(expect.arrayContaining(['foo', 'bar']));
  });

  it('handles optional params', () => {
    expect(utils.extractParamsFromPath('/:foo(/:bar)')).toEqual(expect.arrayContaining(['foo', 'bar']));
  });

  it('returns an empty array if no params are present', () => {
    expect(utils.extractParamsFromPath('/foo/bar')).toEqual([]);
  });
});

describe('parseUrl(URLString)', () => {
  expect(utils.parseUrl('https://evan:password@google.com:8080/yar?foo=bar&yah=nah#nah')).toMatchObject({
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
    expect(utils.getRouteParamsForURL({ params: [] }, 'https://fizz.com/foo')).toEqual({});
  });

  it('returns a hash of the route params', () => {
    const path = '/foo(/:bar)/:baz';

    expect(
      utils.getRouteParamsForURL(
        {
          params: utils.extractParamsFromPath(path),
          test: regexify(path),
        },
        'https://fizz.com/foo/baz/buzz'
      )
    ).toMatchObject({
      bar: 'baz',
      baz: 'buzz',
    });
  });

  it('handles missing optional fragments', () => {
    const path = '/foo(/:bar)/:baz';

    expect(
      utils.getRouteParamsForURL(
        {
          params: utils.extractParamsFromPath(path),
          test: regexify(path),
        },
        'https://fizz.com/foo/buzz'
      )
    ).toMatchObject({
      baz: 'buzz',
    });
  });
});

describe('route(URLString, Boolean?)', () => {
  beforeEach(() => {
    jest.spyOn(window, 'dispatchEvent').mockImplementation(() => {});
    jest.spyOn(history, 'pushState').mockImplementation(() => {});
    jest.spyOn(history, 'replaceState').mockImplementation(() => {});
  });

  it('uses pushState by default to change the URL', () => {
    utils.route('/foo');
    expect(history.pushState).toHaveBeenCalledWith({}, '', '/foo');
  });

  it('uses replaceState if the second argument is false', () => {
    utils.route('/foo', false);
    expect(history.replaceState).toHaveBeenCalledWith({}, '', '/foo');
  });

  it('ultimately dispatches a popstate event', () => {
    utils.route('/foo', false);

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'popstate',
      })
    );
  });
});

describe('match(Object[], URLString)', () => {
  let routes;

  beforeEach(() => {
    routes = [{ path: '/foo/:id', somethingArbitrary: [] }, { path: '/bar/:id', redirect: '/foo/1' }];
  });

  it('returns a routing context object', () => {
    expect(utils.match(routes, 'https://baz.com/foo/1')).toEqual({
      route: expect.objectContaining({
        somethingArbitrary: [],
        path: '/foo/:id',
      }),
      location: expect.objectContaining({
        pathname: '/foo/1',
      }),
      params: {
        id: '1',
      },
    });
  });

  it('returns a redirect hint if tripped', () => {
    expect(utils.match(routes, 'https://baz.com/bar/1')).toEqual({
      route: expect.objectContaining(routes[0]),
      location: expect.objectContaining({
        pathname: '/foo/1',
      }),
      params: {
        id: '1',
      },
      redirect: 'https://baz.com/foo/1',
    });
  });

  it('works with a regex route', () => {
    routes = [{ path: /\/[a-z]+$/i }, { path: /\/\d+$/ }, { path: '*' }];

    expect(utils.match(routes, 'https://baz.com/123')).toEqual({
      route: expect.objectContaining(routes[1]),
      location: expect.objectContaining({
        pathname: '/123',
      }),
      params: {},
    });
  });

  it('works with a function route', () => {
    routes = [{ path: url => url.endsWith('2') }, { path: url => url.endsWith('3') }, { path: '*' }];

    expect(utils.match(routes, 'https://baz.com/123')).toEqual({
      route: expect.objectContaining(routes[1]),
      location: expect.objectContaining({
        pathname: '/123',
      }),
      params: {},
    });
  });
});
