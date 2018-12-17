# Parindent

__[Try it online](https://shaunlebron.github.io/parindent/)__

**WIP public prototype**— Indent Clojure files based on the following discussions:

- [Daniel Compton's call for a "no config" clojure formatter](https://clojureverse.org/t/clj-commons-building-a-formatter-like-gofmt-for-clojure/3240)
- [Nikita Prokopov's proposed simple rules](http://tonsky.me/blog/clojurefmt/)
- [discussion on indentation rules](https://github.com/clj-commons/formatter/issues/9)

## Current Rules

1. ALLOW - 1-space, 2-space, or Arg-alignment (user preference determined by first sibling line)
2. ENFORCE - vertically aligned sibling lines
3. ENFORCE - indentation after a paren should imply containment

## Friction

Staggered indentation of siblings not allowed:

```diff
 (cond
   foo
-    bar
+  bar

   baz
-    qux)
+    qux)
```

Cannot indent past an open-paren unless contained inside it ([Parinfer]):

[Parinfer]:http://shaunlebron.github.io/parinfer

```diff
 (defn foo
  ([a b]
-    (+ a b))
+  (+ a b))
  ([a b c]
-    (+ a b c)))
+  (+ a b c)))
```


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
