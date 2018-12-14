// MINIMAL LISP INDENTER
// (using the MINIMAL LISP READER)
//
// Fix the indentation of every line using very simple rules.

//------------------------------------------------------------------------------
// Reader hooks
//------------------------------------------------------------------------------

function onInitState(state) {
  state.indentFixes = [];
}

function onFinalState(state) {}

function onInitLine(state) {
  state.indentDelta = 0;
}

function onOpener(state, opener) {
  opener.indentDelta = state.indentDelta;
  opener.childIndentX = UINT_NULL;
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

//------------------------------------------------------------------------------
// Indentation correction
//------------------------------------------------------------------------------

function getOpenerIndentSize(state, opener) {
  if (opener.ch === "[") {
    return 1;
  } else if (opener.ch === "{") {
    return 1;
  } else if (opener.ch === "(") {
    const lineNo = opener.lineNo;
    const codeX = scanForCode(state, opener.x, lineNo);
    if (codeX !== UINT_NULL) {
      const spaceX = scanForSpace(state, codeX, lineNo);
      if (isSymbol(state.lines[lineNo].slice(codeX, spaceX))) {
        const argX = scanForCode(state, spaceX, lineNo);
        if (argX === state.x) {
          return argX - opener.x;
        }
        return 2;
      }
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
// Extra reader code
//------------------------------------------------------------------------------

function scanForCode(state, x, lineNo) {
  // TODO:
  // scan characters until reaching non-whitespace
  // if quote or semicolon or end reached, return UINT_NULL
  // else return x
}

function scanForSpace(state, x, lineNo) {
  // TODO:
  // scan characters until reaching space
  // return x
  // if reach end, return line length
}

function isSymbol(str) {
  // TODO:
}
