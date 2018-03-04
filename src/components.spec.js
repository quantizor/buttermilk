import React from 'react';
import ReactDOM from 'react-dom';

import { Router, RoutingState } from './components';

let root;
const render = props => ReactDOM.render(<Router {...props} />, root);

beforeAll(() => document.body.appendChild((root = document.createElement('main'))));
beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => ReactDOM.unmountComponentAtNode(root));

describe('Router', () => {
    it('renders a simple element child', () => {
        render({
            routes: [{
                path: '/foo',
                render: () => <div>bar</div>,
            }],
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
            routes: [{
                path: '/foo',
                render: () => Foo,
            }],
            url: 'http://foo.com/foo',
        });

        expect(JSON.parse(root.innerHTML)).toMatchObject({
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
            routes: [{
                path: '/foo',
                render: () => <div>bar</div>,
            }],
            url: 'http://foo.com/foo',
        });

        expect(console.warn).toHaveBeenCalled();
    });

    it('does not warn if a fallback route was provided', () => {
        render({
            routes: [{
                path: '/foo',
                render: () => <div>bar</div>,
            }, {
                path: '*',
                render: () => <div>oh well</div>,
            }],
            url: 'http://foo.com/foo',
        });

        expect(console.warn).not.toHaveBeenCalled();
    });

    it('handles popstate events', () => {
        const instance = render({
            routes: [{
                path: '/foo',
                render: () => <div>bar</div>,
            }, {
                path: '*',
                render: () => <div>oh well</div>,
            }],
            url: 'http://foo.com/foo',
        });

        expect(root.innerHTML).toContain('bar');

        jest.spyOn(instance, 'getURL').mockImplementation(() => 'http://foo.com/bar');
        window.dispatchEvent(new Event('popstate'));

        expect(root.innerHTML).toContain('oh well');
    });

    it('handles hashchange events', () => {
        const instance = render({
            routes: [{
                path: '#foo',
                render: () => <div>bar</div>,
            }, {
                path: '*',
                render: () => <div>oh well</div>,
            }],
            url: 'http://foo.com/#foo',
        });

        expect(root.innerHTML).toContain('bar');

        jest.spyOn(instance, 'getURL').mockImplementation(() => 'http://foo.com/');
        window.dispatchEvent(new Event('hashchange'));

        expect(root.innerHTML).toContain('oh well');
    });
});

describe('RoutingState', () => {
    it('inherits the routing state from the parent Router', () => {
        class Foo extends React.Component {
            render() {
                return (
                    <div id="inner">
                        <RoutingState>
                            {state => {
                                return JSON.stringify(state);
                            }}
                        </RoutingState>
                    </div>
                );
            }
        }

        render({
            routes: [{
                path: '/foo',
                render: () => Foo,
            }],
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
                        <RoutingState>
                            {state => {
                                return JSON.stringify(state);
                            }}
                        </RoutingState>
                    </div>
                );
            }
        }

        const instance = render({
            routes: [{
                path: '/foo(/:id)',
                render: () => Foo,
            }],
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

        jest.spyOn(instance, 'getURL').mockImplementation(() => 'http://foo.com/foo/bar');
        window.dispatchEvent(new Event('popstate'));

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
