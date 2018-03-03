import hoist from 'hoist-non-react-statics';
import mitt from 'mitt';
import PropTypes from 'prop-types';
import React from 'react';

import { CHANNEL } from './constants';
import regexify from './regexify';

import {
    extractParamsFromPath,
    findRoute,
    getDisplayName,
    getRouteParamsForURL,
    parseUrl,
} from './utils';

export class Router extends React.Component {
    static childContextTypes = {
        [CHANNEL]: PropTypes.object,
    };

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

    emitter = mitt();
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
            this.setState(
                this.getStateUpdateForUrl(
                    nextProps.url, this.processRoutes(nextProps.routes)
                )
            );
        } else if (nextProps.url !== this.state.url) {
            this.setState(
                this.getStateUpdateForUrl(
                    nextProps.url, this.props.routes
                )
            );
        }
    }

    getChildContext(context) {
        return Object.assign({}, context, {
            [CHANNEL]: {
                emitter: this.emitter,
                getRoutingState: this.getRoutingState,
            },
        });
    }

    render() {
        if (this.state.children === null) {
            return React.createElement(this.props.loadingComponent, this.getRoutingState());
        }

        return React.cloneElement(this.state.children, this.getRoutingState());
    }

    /**
     * Returns a react-router-esque object with parsed location and params.
     */
    getRoutingState = () => {
        const url = this.state.url;

        return {
            location: parseUrl(url),
            params: getRouteParamsForURL(this.state.routes, url),
            route: this.state.activeRoute,
        };
    }

    processRoutes(routes) {
        return routes.map(
            route =>
                Object.assign({}, route, {
                    params: extractParamsFromPath(route.path),
                    test: regexify(route.path),
                })
        );
    }

    getURL() {
        return window.location.href;
    }

    getStateUpdateForUrl(url, routes) {
        const nextRoute = findRoute(routes, url);

        return {
            activeRoute: route,
            children: this.processChildren(route.render()),
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

export function withLocation(Component) {
    class WithLocation extends React.Component {
        static contextTypes = {
            [CHANNEL]: PropTypes.object,
        };

        static displayName = `WithLocation(${getDisplayName(Component)})`;
        static WrappedComponent = Component;

        componentWillMount() {
            this.cacheRoutingState();
            this.context[CHANNEL].emitter.on('*', this.cacheRoutingState);
        }

        componentWillUnmount() {
            this.context[CHANNEL].emitter.off('*', this.cacheRoutingState);
        }

        cacheRoutingState = () => this.setState(this.context[CHANNEL].getRoutingState())

        render() {
            return React.createElement(
                Component, Object.assign({}, this.props, this.state)
            );
        }
    }

    hoist(WithLocation, Component);

    return WithLocation;
}
