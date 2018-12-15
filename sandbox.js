const { fixIndent } = require("./indent.js");

const text = `
(defn foo
  "hello, this is a docstring"
  [a b]
  (let [sum (+ a b)
        prod (* a b)
      ]
     {:sum sum
      :prod prod
    }))

(   foo bar
        baz)

(123 bar
     baz)

(:foo bar
      baz)

("foo" bar
       baz)

((foo) bar
       baz)

(foo bar
     baz)

(foo(bar)
    baz)

(foo (bar)
     baz)

(foo;bar
    baz)

(foo ;bar
     baz)

(foo"bar"
    baz)

(foo "bar"
     baz
     )
`.trim();

const result = fixIndent(text);

console.log("\nInput:");
console.log(text);

console.log("\nIndent fixes:");
console.log(result.indentFixes);

console.log("\nResult:");
console.log(result.text);
