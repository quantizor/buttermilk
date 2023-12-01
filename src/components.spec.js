import React, { useContext, lazy } from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import * as lib from './components';
import { route } from './utils';

let root;
const render = ({ url, ...props }) => {
  jsdom.reconfigure({ url });

  act(() => {
    ReactDOM.render(<lib.Router {...props} />, root);
  });
};

beforeAll(() => document.body.appendChild((root = document.createElement('main'))));
beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => ReactDOM.unmountComponentAtNode(root));

const updateJSDOMUrl = (url, eventType) => {
  act(() => {
    window.history.pushState({}, null, url);
    window.dispatchEvent(new Event(eventType));
  });
};

describe('Router', () => {
  it('renders a simple element child', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => <div>bar</div>,
        },
        {
          path: '*',
          render: () => <div>oh well</div>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(root.innerHTML).toContain('bar');
  });

  it('renders a lazy child', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => lazy(() => Promise.resolve({ default: <div>bar</div> })),
        },
        {
          path: '*',
          render: () => <div>oh well</div>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(root.innerHTML).toContain('bar');
  });

  it('renders the correct route with a home route also present', () => {
    render({
      routes: [
        {
          path: '/',
          render: () => <div>Home</div>,
        },
        {
          path: '/foo',
          render: () => <div>bar</div>,
        },
        {
          path: '*',
          render: () => <div>oh well</div>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(root.innerHTML).toContain('bar');
  });

  it('renders a child component class with the current routing state', () => {
    class Foo extends React.Component {
      render() {
        return JSON.stringify(this.props);
      }
    }

    render({
      routes: [
        {
          path: '/foo',
          render: () => Foo,
        },
        {
          path: '*',
          render: () => <div>oh well</div>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(JSON.parse(root.children[0].innerHTML)).toMatchObject({
      location: {
        href: 'http://foo.com/foo',
        params: {},
        pathname: '/foo',
        query: {},
      },
    });
  });

  it('warns if no fallback route was provided', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => <div>bar</div>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(console.warn).toHaveBeenCalled();
  });

  it('does not warn if a fallback route was provided', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => <div>bar</div>,
        },
        {
          path: '*',
          render: () => <div>oh well</div>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(console.warn).not.toHaveBeenCalled();
  });

  it('handles popstate events', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => <div>bar</div>,
        },
        {
          path: '*',
          render: () => <div>oh well</div>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(root.innerHTML).toContain('bar');

    act(() => updateJSDOMUrl('http://foo.com/bar', 'popstate'));

    expect(root.innerHTML).toContain('oh well');
  });

  it('handles hashchange events', () => {
    render({
      routes: [
        {
          path: '#foo',
          render: () => <div>bar</div>,
        },
        {
          path: '*',
          render: () => <div>oh well</div>,
        },
      ],
      url: 'http://foo.com/#foo',
    });

    expect(root.innerHTML).toContain('bar');

    act(() => updateJSDOMUrl('http://foo.com/', 'hashchange'));

    expect(root.innerHTML).toContain('oh well');
  });

  it('handles the route(url) utility', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => <div>bar</div>,
        },
        {
          path: '/bar',
          render: () => <div>baz</div>,
        },
        {
          path: '*',
          render: () => <div>oh well</div>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(root.innerHTML).toContain('bar');

    act(() => {
      history.pushState({}, null, 'http://foo.com/bar');
      route('/bar');
    });

    expect(root.innerHTML).toContain('baz');
  });

  describe('routerDidInitialize', () => {
    it('is called upon construction with the initially-active routing', () => {
      const stub = jest.fn();

      render({
        routerDidInitialize: stub,
        routes: [
          {
            path: '#foo',
            render: () => <div>bar</div>,
          },
          {
            path: '*',
            render: () => <div>oh well</div>,
          },
        ],
        url: 'http://foo.com/#foo',
      });

      expect(stub).toHaveBeenCalledWith({
        location: expect.objectContaining({
          hash: '#foo',
        }),
        params: {},
        route: expect.objectContaining({
          path: '#foo',
        }),
      });
    });
  });

  describe('routeWillChange', () => {
    it('is called before applying a route update', () => {
      const stub = jest.fn();

      render({
        routes: [
          {
            path: '/bar',
            render: () => <div>bar</div>,
          },
          {
            path: '*',
            render: () => <div>oh well</div>,
          },
        ],
        routeWillChange: stub,
        url: 'http://foo.com/bar',
      });

      act(() => updateJSDOMUrl('http://foo.com', 'popstate'));

      expect(stub).toHaveBeenCalledWith(
        expect.objectContaining({
          route: expect.objectContaining({
            path: '/bar',
          }),
        }),

        expect.objectContaining({
          route: expect.objectContaining({
            path: '*',
          }),
        })
      );
    });

    it('accepts a promise', async () => {
      const stub = jest.fn();

      render({
        routes: [
          {
            path: '/bar',
            render: () => <div>bar</div>,
          },
          {
            path: '*',
            render: () => <div>oh well</div>,
          },
        ],
        routeWillChange: () => Promise.resolve(),
        routeDidChange: stub,
        url: 'http://foo.com/bar',
      });

      await act(async () => await updateJSDOMUrl('http://foo.com', 'popstate'));

      expect(stub).toHaveBeenCalled();
    });

    it('is abortable by returning false', () => {
      const stub = jest.fn();

      render({
        routes: [
          {
            path: '/bar',
            render: () => <div>bar</div>,
          },
          {
            path: '*',
            render: () => <div>oh well</div>,
          },
        ],
        routeWillChange: () => false,
        routeDidChange: stub,
        url: 'http://foo.com/bar',
      });

      act(() => updateJSDOMUrl('http://foo.com', 'popstate'));

      expect(stub).not.toHaveBeenCalled();
    });

    it('is abortable by rejecting a promise', async () => {
      const stub = jest.fn();

      render({
        routes: [
          {
            path: '/bar',
            render: () => <div>bar</div>,
          },
          {
            path: '*',
            render: () => <div>oh well</div>,
          },
        ],
        routeWillChange: () => Promise.reject(),
        routeDidChange: stub,
        url: 'http://foo.com/bar',
      });

      await act(async () => await updateJSDOMUrl('http://foo.com', 'popstate'));

      expect(stub).not.toHaveBeenCalled();
    });
  });

  describe('routeDidChange', () => {
    it('is called after applying a route update', () => {
      const stub = jest.fn();

      render({
        routes: [
          {
            path: '/bar',
            render: () => <div>bar</div>,
          },
          {
            path: '*',
            render: () => <div>oh well</div>,
          },
        ],
        routeDidChange: stub,
        url: 'http://foo.com/bar',
      });

      act(() => updateJSDOMUrl('http://foo.com', 'popstate'));

      expect(stub).toHaveBeenCalledWith(
        expect.objectContaining({
          route: expect.objectContaining({
            path: '*',
          }),
        }),

        expect.objectContaining({
          route: expect.objectContaining({
            path: '/bar',
          }),
        })
      );
    });
  });
});

describe('RoutingState', () => {
  it('inherits the routing state from the parent Router', () => {
    class Foo extends React.Component {
      render() {
        return (
          <div id="inner">
            <lib.RoutingState>
              {state => {
                return JSON.stringify(state);
              }}
            </lib.RoutingState>
          </div>
        );
      }
    }

    render({
      routes: [
        {
          path: '/foo',
          render: () => Foo,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(JSON.parse(root.querySelector('#inner').innerHTML)).toMatchObject({
      location: {
        href: 'http://foo.com/foo',
        params: {},
        pathname: '/foo',
        query: {},
      },
    });
  });

  it('reflects updates in routing state', () => {
    class Foo extends React.Component {
      render() {
        return (
          <div id="inner">
            <lib.RoutingState>
              {state => {
                return JSON.stringify(state);
              }}
            </lib.RoutingState>
          </div>
        );
      }
    }

    render({
      routes: [
        {
          path: '/foo(/:id)',
          render: () => Foo,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(JSON.parse(root.querySelector('#inner').innerHTML)).toMatchObject({
      location: {
        href: 'http://foo.com/foo',
        params: {},
        pathname: '/foo',
        query: {},
      },
    });

    act(() => updateJSDOMUrl('http://foo.com/foo/bar', 'popstate'));

    expect(JSON.parse(root.querySelector('#inner').innerHTML)).toMatchObject({
      location: {
        href: 'http://foo.com/foo/bar',
        pathname: '/foo/bar',
        query: {},
      },
      params: {
        id: 'bar',
      },
    });
  });
});

describe('useContext(RoutingContext)', () => {
  function Foo() {
    const state = useContext(lib.RoutingContext);

    return <div id="inner">{JSON.stringify(state)}</div>;
  }

  it('inherits the routing state from the parent Router', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => Foo,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(JSON.parse(root.querySelector('#inner').innerHTML)).toMatchObject({
      location: {
        href: 'http://foo.com/foo',
        params: {},
        pathname: '/foo',
        query: {},
      },
    });
  });

  it('reflects updates in routing state', () => {
    render({
      routes: [
        {
          path: '/foo(/:id)',
          render: () => Foo,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(JSON.parse(root.querySelector('#inner').innerHTML)).toMatchObject({
      location: {
        href: 'http://foo.com/foo',
        params: {},
        pathname: '/foo',
        query: {},
      },
    });

    act(() => updateJSDOMUrl('http://foo.com/foo/bar', 'popstate'));

    expect(JSON.parse(root.querySelector('#inner').innerHTML)).toMatchObject({
      location: {
        href: 'http://foo.com/foo/bar',
        pathname: '/foo/bar',
        query: {},
      },
      params: {
        id: 'bar',
      },
    });
  });
});

describe('Link', () => {
  beforeEach(() => {
    jest.spyOn(history, 'pushState').mockImplementation(() => {});
    jest.spyOn(window, 'open').mockImplementation(() => {});
  });

  it('renders as an anchor tag by default', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => <lib.Link href="/bar">Baz</lib.Link>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(root.innerHTML).toMatchSnapshot();
  });

  it('renders as a different component if provided', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => (
            <lib.Link as="div" href="/bar">
              Baz
            </lib.Link>
          ),
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(root.innerHTML).toMatchSnapshot();
  });

  it('sets [data-active] if the link href matches the active route', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => <lib.Link href="/foo">Baz</lib.Link>,
        },
      ],
      url: 'http://foo.com/foo',
    });

    expect(root.innerHTML).toMatchSnapshot();
  });

  it('changes the routing state on click', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => <lib.Link href="/bar">Baz</lib.Link>,
        },
        {
          path: '/bar',
          render: () => 'It worked.',
        },
      ],
      url: 'http://foo.com/foo',
    });

    act(() => {
      Simulate.click(root.querySelector('a'));
    });

    expect(history.pushState).toHaveBeenCalledWith({}, '', '/bar');
  });

  it('opens a new tab if metaKey is pressed while clicking the link', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => <lib.Link href="/bar">Baz</lib.Link>,
        },
        {
          path: '/bar',
          render: () => 'It worked.',
        },
      ],
      url: 'http://foo.com/foo',
    });

    act(() => {
      Simulate.click(root.querySelector('a'), {
        metaKey: true,
      });
    });

    expect(window.open).toHaveBeenCalledWith('/bar');
    expect(history.pushState).not.toHaveBeenCalled();
  });

  it('opens a new tab if target is set to _blank', () => {
    render({
      routes: [
        {
          path: '/foo',
          render: () => (
            <lib.Link href="/bar" target="_blank">
              Baz
            </lib.Link>
          ),
        },
        {
          path: '/bar',
          render: () => 'It worked.',
        },
      ],
      url: 'http://foo.com/foo',
    });

    act(() => {
      Simulate.click(root.querySelector('a'));
    });

    expect(window.open).toHaveBeenCalledWith('/bar');
    expect(history.pushState).not.toHaveBeenCalled();
  });
});
