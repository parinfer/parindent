// BROWSER DEMO

import { fixIndent } from "./indent.js";

const inputContainer = document.querySelector(".editor.input");
const outputContainer = document.querySelector(".editor.output");

const defaultInput = `
;; multi-arity function
(defn foo
  ([a b]
     (+ a b))
  ([a b c]
     (+ a b c)))

;; cond pairs
(cond
  foo
    bar
  baz
    qux)

;; ns requires
(ns example.foo
  (:require [example.bar :as bar]
            [example.baz :as baz]))

;; arbitrary arg alignment
(assoc foo :bar bar
           :baz baz)

;; hiccups
[:div {:style {:background "#FFF"
               :color "#000"}}
  [:h1 "title"]
  [:ul
    [:li "item 1"]
    [:li "item 2"]
    [:li "item 3"]]]
`.trim();

const cmInput = CodeMirror(inputContainer, {
  mode: "clojure",
  theme: "github"
});

const cmOutput = CodeMirror(outputContainer, {
  mode: "clojure",
  theme: "github",
  readOnly: true
});

cmInput.on("changes", () => {
  const text = cmInput.getValue();
  const result = fixIndent(text);
  if (result.success) {
    cmOutput.setValue(result.text);
  } else {
    cmOutput.setValue(JSON.stringify(result.error));
  }
});

cmInput.setValue(defaultInput);
