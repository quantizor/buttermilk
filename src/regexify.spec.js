import regexify from './regexify';

it('handles a simple string', () => {
    const test = '/foo';
    const regex = regexify(test);

    expect(regex.test('/foo')).toBe(true);
});

it('handles optional fragments', () => {
    const test = '/foo(/bar)';
    const regex = regexify(test);

    expect(regex.test('/foo')).toBe(true);
    expect(regex.test('/foo/bar')).toBe(true);
});

it('handles multiple optional fragments', () => {
    const test = '/foo(/bar)(/baz)';
    const regex = regexify(test);

    expect(regex.test('/foo')).toBe(true);
    expect(regex.test('/foo/bar')).toBe(true);
    expect(regex.test('/foo/bar/baz')).toBe(true);
    expect(regex.test('/foo/bar/baz/fizz')).toBe(false);
});

it('handles dynamic fragments', () => {
    const test = '/foo/:id';
    const regex = regexify(test);

    expect(regex.test('/foo/bar')).toBe(true);
});

it('handles query strings', () => {
    const test = '?foo=bar';
    const regex = regexify(test);

    expect(regex.test('/foo/bar?foo=bar')).toBe(true);
    expect(regex.test('/foo/bar')).toBe(false);
});

it('handles parts of query strings', () => {
    const test = '?foo=bar';
    const regex = regexify(test);

    expect(regex.test('/foo/bar?fizz=buzz&foo=bar')).toBe(true);
    expect(regex.test('/foo/bar')).toBe(false);
});

it('handles periods in the path', () => {
    const test = '/foo.html';
    const regex = regexify(test);

    expect(regex.test('/foo.html')).toBe(true);
    expect(regex.test('/foo.htm')).toBe(false);
});

it('handles a complex route definition', () => {
    const test = '/foo(/:id)/bar.html';
    const regex = regexify(test);

    expect(regex.test('/foo/bar.html')).toBe(true);
    expect(regex.test('/foo/baz/bar.html')).toBe(true);
});
