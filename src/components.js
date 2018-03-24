import createContext from 'create-react-context';
import PropTypes from 'prop-types';
import React from 'react';

import regexify from './regexify';

import {
    extractParamsFromPath,
    findRoute,
    getDisplayName,
    getRouteParamsForURL,
    parseUrl,
    route,
    valid,
} from './utils';

const CONTEXT = createContext('buttermilk');
const BROWSER = typeof window !== 'undefined';
const NOOP = function () {};

/**
 * The gist of Buttermilk's router is that it acts like a controlled component when used
 * server-side (driven by `props.url`) and an uncontrolled one client-side (driven by the
 * value of `window.location.href` and intercepted navigation events.)
 *
 * In the browser, use either a <Link> component or the route() method to change routes.
 * The router will also automatically pick up popstate events caused by user-driven browser
 * navigation (forward, back buttons, etc.)
 */
export class Router extends React.Component {
    static propTypes = {
        /**
         * Provide a spinner or something to look at while the promise
         * is in flight if using async routes.
         */
        loadingComponent: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
        ]),

        /**
         * An optional app runtime component. Think of it like the "shell" of your
         * app, so perhaps the outer container, nav bar, etc. You'll probably want to
         * put any "Provider" type components here that are intended to wrap your
         * whole application.
         */
        outerComponent: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
        ]),

        routes: PropTypes.arrayOf(
            PropTypes.shape({
                /**
                 * A RegExp, string, or function accepting the URL as
                 * an argument and returning a boolean if valid.
                 */
                path: PropTypes.oneOfType([
                    PropTypes.instanceOf(RegExp),
                    PropTypes.string,
                    PropTypes.func,
                ]).isRequired,

                /**
                 * A string URL path to a different route. If this is given,
                 * then "render" is not required.
                 */
                redirect: PropTypes.string,

                /**
                 * A function that returns one of the following:
                 *
                 * 1. JSX.
                 * 2. A React component class.
                 * 3. A promise resolving to JSX or a React component class.
                 */
                render: PropTypes.func,
            }),
        ).isRequired,

        /**
         * A hook for reacting to an impending route transition. Accepts a promise
         * and will pause the route transition until the promise is resolved. Return
         * false or reject a given promise to abort the routing update.
         *
         * Provides currentRouting and nextRouting as arguments.
         */
        routeWillChange: PropTypes.func,

        /**
         * A hook for reacting to a completed route transition. It might be used
         * for synchronizing some global state if desired.
         *
         * Provides currentRouting and previousRouting as arguments.
         */
        routeDidChange: PropTypes.func,

        /**
         * A hook for synchronizing initial routing state.
         *
         * Providers initialRouting as an argument.
         */
        routerDidInitialize: PropTypes.func,

        /**
         * The initial URL to be used for processing, falls back to
         * window.location.href for non-SSR. Required for environments without
         * browser navigation eventing.
         */
        url: PropTypes.string,
    };

    static defaultProps = {
        loadingComponent: 'div',
        outerComponent: 'div',
        routeDidChange: NOOP,
        routeWillChange: NOOP,
        routerDidInitialize: NOOP,
        url: '',
    };

    static getURL = function () { return window.location.href; }

    noFallbackWarningEmitted = false;
    promise = null;

    constructor(props, context) {
        super(props, context);

        if (!BROWSER && !props.url) {
            throw new Error('props.url is required for non-browser environments');
        }

        const routes = this.processRoutes(props.routes);
        const url = props.url || Router.getURL();

        this.state = this.getStateUpdateForUrl(url, routes);

        props.routerDidInitialize(this.getContextValue(url, this.state.activeRoute));
    }

    /**
     * In a browser setting, we only want to rely on browser navigation events
     * to determine routing updates.
     */
    shouldRecompute(nextProps) {
        return      nextProps.routes !== this.props.routes
               || ((nextProps.url !== this.state.url) && !BROWSER);
    }

    componentWillReceiveProps(nextProps) {
        if (this.shouldRecompute(nextProps)) {
            this.recomputeRoutingState(
                BROWSER ? this.state.url : nextProps.url, nextProps.routes
            );
        }
    }

    componentDidMount() {
        window.addEventListener('popstate', this.handleLocationChange);
        window.addEventListener('hashchange', this.handleLocationChange);
    }

    componentWillUnmount() {
        window.removeEventListener('popstate', this.handleLocationChange);
        window.removeEventListener('hashchange', this.handleLocationChange);
    }

    render() {
        const contextValue = this.getContextValue(this.state.url, this.state.activeRoute);

        return (
            <CONTEXT.Provider value={contextValue}>
                <this.props.outerComponent {...contextValue}>
                    {this.renderChildren(this.state.children, contextValue)}
                </this.props.outerComponent>
            </CONTEXT.Provider>
        );
    }

    renderChildren(renderable, routingProps) {
        if (renderable === null) {
            return React.createElement(this.props.loadingComponent, routingProps);
        } else if (!React.isValidElement(renderable)) {
            return React.createElement(renderable, routingProps);
        } else {
            return renderable;
        }
    }

    processChildren(unknown) {
        if (unknown instanceof Promise) {
            const instance = this;
            instance.promise = unknown;
            unknown.then(function handlePromiseResolution(result) {
                /**
                 * Is this promise still valid? If not, ignore the
                 * resolution.
                 */
                if (instance.promise === this) {
                    instance.setState({ children: result });
                    this.promise = null;
                }
            }.bind(unknown));

            return null;
        } else {
            return unknown;
        }
    }

    handleLocationChange = (/* event */) => {
        const currentValue = this.getContextValue(this.state.url, this.state.activeRoute);
        const { route: nextRoute, url: nextUrl } = findRoute(this.state.routes, Router.getURL());
        const nextValue = this.getContextValue(nextUrl, nextRoute);
        const result = this.props.routeWillChange(currentValue, nextValue);
        const cb = () => this.props.routeDidChange(nextValue, currentValue);
        const finish = () => this.recomputeRoutingState(nextUrl, this.state.routes, cb);

        // TODO: tests
        if (result === false) return;

        // TODO: tests
        else if (result instanceof Promise) result.then(() => finish());

        else finish();
    }

    recomputeRoutingState = (url, routes, cb) => {
        this.setState(
            this.getStateUpdateForUrl(
                url, routes === this.state.routes ? routes : this.processRoutes(routes)
            ), cb
        );
    }

    /**
     * Returns a react-router-esque object with parsed location and params.
     */
    getContextValue = (url, route) => {
        return {
            location: parseUrl(url),
            params: getRouteParamsForURL(route, url),
            route,
        };
    }

    processRoutes(routes) {
        if (process.env.NODE_ENV !== 'production') {
            if (!this.noFallbackWarningEmitted && routes.every(route => route.path !== '*')) {
                console.warn('no fallback route "*" was supplied. if a matching route is not found, the router will throw');
                this.noFallbackWarning = true;
            }
        }

        return routes.map(
            route =>
                Object.assign({}, route, {
                    params: extractParamsFromPath(route.path),
                    test: regexify(route.path),
                })
        );
    }

    getStateUpdateForUrl(url, routes) {
        const result = findRoute(routes, url);

        return {
            activeRoute: result.route,
            children: this.processChildren(
                result.route.render(
                    this.getContextValue(
                        result.url, result.route
                    )
                )
            ),
            routes,
            url: result.url,
        };
    }
}

/**
 * Compose it like this:
 *
 * <RoutingState>
 *   {({ location, params, route }) => {
 *      return <div>{location.pathname}</div>
 *   }}
 * </RoutingState>
 */
export const RoutingState = CONTEXT.Consumer;

/**
 * A polymorphic anchor link component. On click/tap/enter if the destination
 * matches a value route, the routing context will be modified without
 * reloading the page. Otherwise, it will act like a normal anchor link.
 *
 * If something other than an anchor tag is specified via props.as, a
 * [role="link"] attribute will be added for basic assistive technology support.
 *
 * Adds [data-active] if the given href matches the active route.
 */
export class Link extends React.PureComponent {
    static propTypes = {
        /**
         * An HTML tag name or valid ReactComponent class to be rendered. Must
         * be compatible with React.createElement.
         *
         * Defaults to an anchor "a" tag.
         */
        as: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
        ]),

        /**
         * A valid relative or absolute URL string.
         */
        href: PropTypes.string.isRequired,

        /**
         * Any valid value of the anchor tag "target" attribute.
         *
         * See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-target
         */
        target: PropTypes.string,
    };

    static defaultProps = {
        as: 'a',
    };

    render() {
        return (
            <CONTEXT.Consumer>
                {({ route }) => {
                    return React.createElement(this.props.as, Object.assign({}, this.props, {
                        'data-active': valid(route.test, this.props.href) ? '' : undefined,
                        as: undefined,
                        href: this.shouldRenderAnchorProps() ? this.props.href : undefined,
                        role: this.shouldRenderRole() ? 'link' : undefined,
                        onClick: this.handleNavigationIntent,
                        onKeyDown: this.handleNavigationIntent,
                        onTouchEnd: this.handleNavigationIntent,
                        target: this.shouldRenderAnchorProps() ? this.props.target : undefined,
                    }));
                }}
            </CONTEXT.Consumer>
        );
    }

    shouldRenderAnchorProps() {
        return this.props.as === Link.defaultProps.as || typeof this.props.as !== 'string';
    }

    shouldRenderRole() {
        return this.props.as !== Link.defaultProps.as;
    }

    handleNavigationIntent = e => {
        if (e.type !== 'keydown' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === 'Space'))) {
            e.preventDefault();
            e.stopPropagation();

            if (e.metaKey || e.target.getAttribute('target') === '_blank') {
                window.open(this.props.href);
            } else {
                route(this.props.href);
            }
        }
    };
}
