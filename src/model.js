/*
- static
  /foo

- dynamic fragments
  /foo/:id/:date

- optional fragments
  /foo(/bar)/baz

- functional routing
  validate(url)

- regex routing
  ^(?=bar)\/foo

- query string routing
  ?foo=bar

- redirect
  /foo -> /bar
*/

url = '/foo'

routes = [
    { test: /^(?=bar)\/foo/,              render: () => {} },
    { test: regexify('/foo(/bar)/baz'),   render: () => {} },
    { test: regexify('/foo/:id/:date'),   render: () => {} },
    { test: regexify('?foo=bar'),         render: () => {} },
    { test: valid(),                      render: () => {} },
    { test: regexify('/foo'),             redirect: '/bar' },
]

function valid(validator, url) {
    if (validator instanceof RegExp) {
        return validator.test(url);
    } else if (validator instanceof Function) {
        return validator(url);
    }
}

function route(url) {
    match = routes.find(config => valid(config.test, url));

    if (match.redirect) {
        return route(match.redirect);
    } else if (match) {
        return await match.render();
    } else {
        // 404
    }
}
