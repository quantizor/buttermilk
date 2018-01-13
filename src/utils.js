export function valid(validator, url) {
    if (validator instanceof RegExp) {
        return validator.test(url);
    } else if (validator instanceof Function) {
        return validator(url);
    }
}

export function match(routes, url) {
    const route = routes.find(route => valid(route.test, url));

    if (route) {
        if (route.redirect) return match(routes, route.redirect);
        else                return route;
    }
}

