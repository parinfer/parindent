# Parindent

Indent Clojure files based on the following discussions:

- [Daniel Compton's call for a "no config" clojure formatter](https://clojureverse.org/t/clj-commons-building-a-formatter-like-gofmt-for-clojure/3240)
- [Nikita Prokopov's proposed simple rules](http://tonsky.me/blog/clojurefmt/)
- [discussion on indentation rules](https://github.com/clj-commons/formatter/issues/9)

## Install

```
npm install -g parindent
```

## Try it

To indent all your files **in place**, run from your project root:

```
parindent '**/*.{clj,cljs,cljc}' --write
```

## Usage

```
$ parindent

Usage: parindent [opts] [filename ...]

A minimal indenter for Lisp code (e.g. Clojure)

Available options:
  --write                  Edit the file in-place. (Beware!)
  --list-different or -l   Print filenames of files that are different from Parindent formatting.
  --stdin                  Read input from stdin.
  --version or -v          Print Parindent version.

```

## Current Rules

- **Zero space**:
  - Top-level forms
- **One space**:
  - Vectors, Maps, Sets
  - Lists that do NOT start with symbol
- **Two space**:
  - Lists starting with symbol, whose second line is NOT _arg aligned_
- **Arg-aligned**:
  - Lists starting with symbol, whose second line is _arg aligned_

To clarify, either of the following formats are chosen, depending on how the
`baz` line is originally formatted:

```clj
;; Two space
(foo bar
  baz
  qux)

;; Arg-aligned
(foo bar
     baz
     qux)
```

