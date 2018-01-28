# cream

unshitty routing for React

## goals

- [x] centrally-managed routing
- [ ] obvious API
- [x] async routing made easy (build in something like loadable by default?)
- [ ] SSR
- [x] HMR-friendly
- [ ] extensible (middlewares?)
    - ideally this would allow a redux integration if desired, the ability to perform transitions, etc
- [ ] fast
- [ ] make it as small as possible

## todo

- [ ] routing data model (trie?)
- [ ] action flow
- [ ] react components
- [ ] extension architecture

## types of routing

- static
  /foo

- dynamic fragments
  /foo/:id

- optional fragments
  /foo(/bar)

- functional routing
  validate(url)

- regex routing
  ^(?=bar)/foo

- query string routing
  ?foo=bar

- redirect
  /foo -> /bar
