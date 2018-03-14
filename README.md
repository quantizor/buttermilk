# buttermilk

beautifully simple routing

## goals

- async routing made easy (build in something like loadable by default?)
- centrally-managed routing
- extensible (middlewares?) _ideally this would allow a redux integration if desired, the ability to perform transitions, etc_
- fast
- HMR-friendly
- make it as small as possible
- obvious API
- SSR

## todo

- [x] routing data model ~~(trie?)~~
- [ ] action flow
- [x] react components
- [x] history & hash impl
- [ ] extension architecture

## types of routing

- static
  ```
  /foo
  ```

- dynamic fragments
  ```
  /foo/:id
  ```

- optional fragments
  ```
  /foo(/bar)
  ```

- wildcard routing
  ```
  *
  /foo*
  ```

- splat routing
  ```
  /foo/**/bar.html
  ```

- functional routing
  ```
  validate(url)
  ```

- regex routing
  ```
  ^(?=bar)/foo
  ```

- query string routing
  ```
  ?foo=bar
  ```

- redirect
  ```
  /foo -> /bar
  ```
