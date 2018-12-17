import { fixIndent } from "./indent.js";

const inputContainer = document.getElementById("inputContainer");
const outputContainer = document.getElementById("outputContainer");

const defaultInput = `
(foo
  bar)
`.trim();

const cmInput = CodeMirror(inputContainer, {
  value: defaultInput,
  mode: "clojure"
});

const cmOutput = CodeMirror(outputContainer, {
  mode: "clojure",
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
