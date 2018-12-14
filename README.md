# Parindent

A fork of Parinfer to indent files based on the following discussions:

- [Daniel Compton's call for a "no config" clojure formatter](https://clojureverse.org/t/clj-commons-building-a-formatter-like-gofmt-for-clojure/3240)
- [Nikita Prokopov's proposed simple rules](http://tonsky.me/blog/clojurefmt/)
- [discussion on indentation rules](https://github.com/clj-commons/formatter/issues/9)

## TODO:

- [x] implementation
- [ ] tests
- [ ] cli

## Indentation Rules

- **Zero space**:
  - [x] Top-level forms
- **One space**:
  - [x] Lists that do NOT start with symbol
  - [x] Vectors
  - [x] Maps
  - [x] Sets
- **Two space**:
  - [x] Lists starting with symbol, whose second line is NOT _first-arg aligned_
- **First-arg**:
  - [x] Lists starting with symbol, whose seoncd line is _first-arg aligned_

To clarify, either of the following formats are chosen, depending on how the
`baz` line is originally formatted:

```
;; Two space
(foo bar
  baz
  qux)

;; First-arg
(foo bar
     baz
     qux)
```

## Dev

```
npm install
node sandbox.js
```
