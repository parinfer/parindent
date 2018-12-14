const { read } = require("./read.js");
const { indentHooks, printResult } = require("./indent.js");

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
`.trim();

const result = read(text, indentHooks);

console.log("\nInput:");
console.log(text);

console.log("\nIndent fixes:");
console.log(result.indentFixes);

console.log("\nResult:");
console.log(printResult(result));
