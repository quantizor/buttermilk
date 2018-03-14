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
    valid,
} from './utils';

const CONTEXT = createContext('cream');

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
                 * A function that returns JSX to be rendered, or a promise
                 * that will be resolved with JSX. Only a single JSX child
                 * is allowed.
                 */
                render: PropTypes.func.isRequired,
            }),
        ).isRequired,

        /**
         * The initial URL to be used for processing, falls back to
         * window.location.href for non-SSR. Required for non-browser
         * environments.
         */
        url: PropTypes.string,
    };

    static defaultProps = {
        loadingComponent: 'div',
    };

    noFallbackWarningEmitted = false;
    promise = null;

    constructor(props, context) {
        super(props, context);

        if (typeof window === 'undefined' && !props.url) {
            throw new Error('props.url is required for non-browser environments');
        }

        const routes = this.processRoutes(props.routes);
        const url = props.url || this.getURL();
        const initialRoute = findRoute(routes, url);

        this.state = {
            activeRoute: initialRoute,
            children: this.processChildren(initialRoute.render()),
            routes,
            url,
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.routes !== this.props.routes) {
            this.recomputeRoutingState(nextProps.url, nextProps.routes);
        } else if (nextProps.url !== this.state.url) {
            this.recomputeRoutingState(nextProps.url, this.state.routes);
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
        return (
            <CONTEXT.Provider value={this.getRoutingState()}>
                {this.renderChildren()}
            </CONTEXT.Provider>
        );
    }

    renderChildren() {
        if (this.state.children === null) {
            return React.createElement(this.props.loadingComponent, this.getRoutingState());
        } else if (!React.isValidElement(this.state.children)) {
            return React.createElement(this.state.children, this.getRoutingState());
        } else {
            return this.state.children;
        }
    }

    getURL() {
        return window.location.href;
    }

    handleLocationChange = (/* event */) => {
        this.recomputeRoutingState(this.getURL(), this.state.routes);
    }

    recomputeRoutingState = (url, routes) => {
        this.setState(
            this.getStateUpdateForUrl(
                url, routes === this.state.routes ? routes : this.processRoutes(routes)
            )
        );
    }

    /**
     * Returns a react-router-esque object with parsed location and params.
     */
    getRoutingState = () => {
        const url = this.state.url;

        return {
            location: parseUrl(url),
            params: getRouteParamsForURL(this.state.activeRoute, url),
            route: this.state.activeRoute,
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
        const nextRoute = findRoute(routes, url);

        return {
            activeRoute: nextRoute,
            children: this.processChildren(nextRoute.render()),
            routes,
            url,
        };
    }

    processChildren(promiseOrChildren) {
        if (promiseOrChildren instanceof Promise) {
            const instance = this;
            promise = promiseOrChildren;
            promiseOrChildren.then(function handlePromiseResolution(result) {
                /**
                 * is this promise still valid? if not, ignore the
                 * resolution
                 */
                if (promise === this) {
                    instance.setState({ children: result });
                    promise = null;
                }
            });

            return null;
        } else {
            return promiseOrChildren;
        }
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
 * Adds [data-active] if the given href matches the active route.
 */
export class Link extends React.PureComponent {
    static propTypes = {
        /**
         * An HTML tag name or valid ReactComponent class to be rendered. Must
         * be compatible with React.createElement.
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

    handleNavigationIntent = async e => {
        if (e.type !== 'keydown' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === 'Space'))) {
            e.preventDefault();
            e.stopPropagation();

            if (e.metaKey || e.target.getAttribute('target') === '_blank') {
                window.open(this.props.href);
            } else {
                history.pushState({}, '', this.props.href);
            }
        }
    };
}
