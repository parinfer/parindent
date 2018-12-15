// MINIMAL LISP INDENTER
// (using the MINIMAL LISP READER)
//
// Fix the indentation of every line using very simple rules.

import { UINT_NULL, peek, isOpenParen, readText } from "./read.js";

//------------------------------------------------------------------------------
// Indentation correction
//------------------------------------------------------------------------------

function getOpenerIndentSize(state, opener) {
  if (opener.ch === "[") {
    return 1;
  } else if (opener.ch === "{") {
    return 1;
  } else if (opener.ch === "(") {
    const line = state.lines[opener.lineNo];
    const token = getToken(line, opener.x + 1);
    if (isSymbol(token.str)) {
      const argX = seek(line, token.end, ch => ch !== " ");
      const argExists = argX < line.length && line[argX] !== ";";
      const isAligned = argX === state.x;
      if (argExists && isAligned) {
        const n = argX - opener.x;
        return n;
      }
      return 2;
    }
    return 1;
  }
}

function getCorrectIndentX(state) {
  if (state.parenStack.length === 0) return 0;
  const opener = peek(state.parenStack, 0);
  if (opener.childIndentX === UINT_NULL) {
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
  opener.childIndentX = UINT_NULL;
}

const hooks = {
  onInitState,
  onInitLine,
  onIndent,
  onOpener
};

//------------------------------------------------------------------------------
// Extra reader code
//------------------------------------------------------------------------------

function seek(line, startX, pred) {
  for (let x = startX; x < line.length; x++) {
    if (pred(line[x])) return x;
  }
  return line.length;
}

function getToken(line, x) {
  const start = seek(line, x, ch => ch !== " ");
  const end = seek(line, start + 1, ch => ' \\"({[;'.includes(ch));
  const str = line.slice(start, end);
  return { start, end, str };
}

function isSymbol(str) {
  if (str === "") return false;
  if (str[0].match(/\d/)) return false;
  if (str[0] === ":") return false;
  if (str[0] === "#") return false;
  if (str[0] === "-" || str[0] === "+" || str[0] === ".") {
    if (str[1] && str[1].match(/\d/)) return false;
  }
  const isAlphaNum = ch => ch.match(/[a-zA-Z0-9]/);
  const isSpecial = ch => ".*+!-_?$%&=<>:#/".includes(ch);
  return [...str].every(ch => isAlphaNum(ch) || isSpecial(ch));
}

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

