// MINIMAL LISP INDENTER
// (using the MINIMAL LISP READER)
//
// Fix the indentation of every line using very simple rules.
//
// ENFORCE indentation to imply nesting.
// ENFORCE vertical alignment of siblings.
// ALLOW 1-space or 2-space or Arg-alignment (chosen by first sibling).

import { peek, isOpenParen, readText } from "./read.js";

//------------------------------------------------------------------------------
// Indentation correction
//------------------------------------------------------------------------------

function getOpenerIndentSize(state, opener) {
  // get all indent sizes
  // (foo bar baz quxx
  //  ||            <-- standard 1 and 2 space
  //      |   |   | <-- arg stops > 2
  //  )
  const argStops = opener.children
    .map(tok => tok.x - opener.x)
    .filter(size => 2 < size);
  const sizes = [1, 2, ...argStops];

  // cap indentation size (i.e. parinfer)
  // ((foo)
  //  ||
  //   x      <-- remove two-space to prevent indentation inside (foo)
  //  )
  const [a, b] = opener.children;
  const collFirst = a && isOpenParen(a.ch);
  const preventCollIndent = !b || b.ch === ";";
  const maxSize = collFirst && preventCollIndent ? a.x - opener.x : Infinity;

  // return current size if valid
  const validSizes = sizes.filter(size => size <= maxSize);
  const currSize = state.x - opener.x;
  if (validSizes.includes(currSize)) return currSize;

  // revert to default if valid
  const defaultSize = { "(": 2, "{": 1, "[": 1 }[opener.ch];
  if (validSizes.includes(defaultSize)) return defaultSize;

  // fallback to 1
  return 1;
}

function getCorrectIndentX(state) {
  if (state.parenStack.length === 0) return 0;
  const opener = peek(state.parenStack, 0);
  if (!opener.childIndentX) {
    const indentSize = getOpenerIndentSize(state, opener);
    opener.childIndentX = opener.x + opener.indentDelta + indentSize;
  }
  return opener.childIndentX;
}

//------------------------------------------------------------------------------
// Reader hooks
//------------------------------------------------------------------------------

function onInitState(state) {
  state.indentFixes = [];
}

function onInitLine(state) {
  state.indentDelta = 0;
}

function onIndent(state) {
  const correctIndentX = getCorrectIndentX(state);
  if (state.x !== correctIndentX) {
    state.indentDelta = correctIndentX - state.x;
    state.indentFixes.push({
      lineNo: state.lineNo,
      indentDelta: state.indentDelta
    });
  }
}

function onOpener(state, opener) {
  opener.indentDelta = state.indentDelta;
}

const hooks = {
  onInitState,
  onInitLine,
  onIndent,
  onOpener
};
//------------------------------------------------------------------------------
// Result
//------------------------------------------------------------------------------

function printResult(state) {
  let lines = state.lines.slice();
  for (const fix of state.indentFixes) {
    const n = fix.indentDelta;
    const line = lines[fix.lineNo];
    lines[fix.lineNo] = n < 0 ? line.slice(-n) : " ".repeat(n) + line;
  }
  return lines.join("\n"); // FIXME: CRLF line-endings
}

export function fixIndent(text) {
  const result = readText(text, hooks);
  result.text = printResult(result);
  return result;
}
