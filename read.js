// MINIMAL LISP READER
// (adapted from Parinfer)
//
// Parses enough to find indentation points, parens, and token positions.
//
// Designed for Clojure syntax:
// - Parens:     `(round), {curly}, [square]`
// - Comments:   `; comment rest of line`
// - Strings:    `"string"` (multi-line)
// - Characters: `\char`

//------------------------------------------------------------------------------
// Constants / Predicates
//------------------------------------------------------------------------------

const BACKSLASH = "\\";
const SPACE = " ";
const DOUBLE_QUOTE = '"';
const SEMICOLON = ";";
const TAB = "\t";

const LINE_ENDING_REGEX = /\r?\n/;

const MATCH_PAREN = {
  "{": "}",
  "}": "{",
  "[": "]",
  "]": "[",
  "(": ")",
  ")": "("
};

//------------------------------------------------------------------------------
// State Structure
//------------------------------------------------------------------------------

// This represents the running state. As we scan through each character
// of a given text, we mutate this structure to update the state of our
// system.

function getInitialState(text, hooks = {}) {
  const lines = text.split(LINE_ENDING_REGEX);

  const state = {
    hooks, //                 [object] - callbacks for each step of the reader

    lines, //                 [string array] - input lines that we process line-by-line, char-by-char
    lineNo: -1, //            [integer] - the current input line number
    x: -1, //                 [integer] - the current input x position of the current character (ch)
    ch: "", //                [string] - the current input character

    parenStack: [], //        [array of {ch,x,lineNo,children}] - current parentheses that we are nested inside of
    children: [], //          [array of {ch,x,lineNo,children}] - current forms that have been parsed

    isEscaping: false, //     [boolean] - indicates if the next character will be escaped (e.g. `\c`).  This may be inside string, comment, or code.
    isInStr: false, //        [boolean] - indicates if we are currently inside a string
    isInComment: false, //    [boolean] - indicates if we are currently inside a comment

    trackingTokenStart: true,
    trackingIndent: false, // [boolean] - are we looking for the indentation point of the current line?
    success: false, //        [boolean] - was the input properly formatted enough to create a valid state?

    error: null, //           [object] - {name, message, lineNo, x}
    errorPosCache: {} //      [object] - maps error name to a potential error position
  };

  if (hooks.onInitState) {
    hooks.onInitState(state);
  }

  return state;
}

//------------------------------------------------------------------------------
// Possible Errors
//------------------------------------------------------------------------------

// `state.error.name` is set to any of these
const ERROR_UNCLOSED_QUOTE = "unclosed-quote";
const ERROR_UNCLOSED_PAREN = "unclosed-paren";
const ERROR_UNMATCHED_CLOSE_PAREN = "unmatched-close-paren";
const ERROR_UNMATCHED_OPEN_PAREN = "unmatched-open-paren";
const ERROR_UNHANDLED = "unhandled";

const errorMessages = {
  [ERROR_UNCLOSED_QUOTE]: "String is missing a closing quote.",
  [ERROR_UNCLOSED_PAREN]: "Unclosed open-paren.",
  [ERROR_UNMATCHED_CLOSE_PAREN]: "Unmatched close-paren.",
  [ERROR_UNMATCHED_OPEN_PAREN]: "Unmatched open-paren.",
  [ERROR_UNHANDLED]: "Unhandled error."
};

function cacheErrorPos(state, errorName) {
  const { lineNo, x } = state;
  const e = { lineNo, x };
  state.errorPosCache[errorName] = e;
  return e;
}

function error(state, name) {
  const cache = state.errorPosCache[name];

  const e = {
    readerError: true,
    name: name,
    message: errorMessages[name],
    lineNo: cache ? cache.lineNo : state.lineNo,
    x: cache ? cache.x : state.x
  };
  const opener = peek(state.parenStack, 0);

  if (name === ERROR_UNMATCHED_CLOSE_PAREN) {
    // extra error info for locating the open-paren that it should've matched
    const cache = state.errorPosCache[ERROR_UNMATCHED_OPEN_PAREN];
    if (cache || opener) {
      e.extra = {
        name: ERROR_UNMATCHED_OPEN_PAREN,
        lineNo: cache ? cache.lineNo : opener.lineNo,
        x: cache ? cache.x : opener.x
      };
    }
  } else if (name === ERROR_UNCLOSED_PAREN) {
    e.lineNo = opener.lineNo;
    e.x = opener.x;
  }
  return e;
}

//------------------------------------------------------------------------------
// Line operations
//------------------------------------------------------------------------------

function initLine(state) {
  delete state.errorPosCache[ERROR_UNMATCHED_CLOSE_PAREN];
  delete state.errorPosCache[ERROR_UNMATCHED_OPEN_PAREN];

  state.isInComment = false;
  state.isEscaping = false;
  state.trackingIndent = !state.isInStr;
  state.trackingTokenStart = !state.isInStr;

  if (state.hooks.onInitLine) {
    state.hooks.onInitLine(state);
  }
}

//------------------------------------------------------------------------------
// Misc Utils
//------------------------------------------------------------------------------

export function peek(arr, idxFromBack) {
  const maxIdx = arr.length - 1;
  if (idxFromBack > maxIdx) {
    return null;
  }
  return arr[maxIdx - idxFromBack];
}

//------------------------------------------------------------------------------
// Questions about characters
//------------------------------------------------------------------------------

export function isOpenParen(ch) {
  return ch === "{" || ch === "(" || ch === "[";
}

function isCloseParen(ch) {
  return ch === "}" || ch === ")" || ch === "]";
}

function isValidCloseParen(parenStack, ch) {
  if (parenStack.length === 0) {
    return false;
  }
  return peek(parenStack, 0).ch === MATCH_PAREN[ch];
}

//------------------------------------------------------------------------------
// Literal character events
//------------------------------------------------------------------------------

function onTokenStart(state, opener) {
  state.trackingTokenStart = false;
  const { lineNo, x, ch } = state;
  const parent = peek(state.parenStack, 0);
  (parent || state).children.push(opener || { lineNo, x, ch });
}

function onOpenParen(state) {
  if (isInCode(state)) {
    const opener = {
      lineNo: state.lineNo,
      x: state.x,
      ch: state.ch,
      children: []
    };
    onTokenStart(state, opener);
    state.trackingTokenStart = true;
    if (state.hooks.onOpener) {
      state.hooks.onOpener(state, opener);
    }
    state.parenStack.push(opener);
  }
}

function onMatchedCloseParen(state) {
  const opener = state.parenStack.pop();
  const { lineNo, x, ch } = state;
  opener.closer = { lineNo, x, ch };
  state.trackingTokenStart = true;
}

function onUnmatchedCloseParen(state) {
  throw error(state, ERROR_UNMATCHED_CLOSE_PAREN);
}

function onCloseParen(state) {
  if (isInCode(state)) {
    if (isValidCloseParen(state.parenStack, state.ch)) {
      onMatchedCloseParen(state);
    } else {
      onUnmatchedCloseParen(state);
    }
  }
}

function onTab(state) {
  if (isInCode(state)) {
    const { lineNo, x } = state;
    console.warn("\nTAB character found at", { lineNo, x });
  }
}

function onSemicolon(state) {
  if (isInCode(state)) {
    onTokenStart(state);
    state.isInComment = true;
  }
}

function onQuote(state) {
  if (state.isInStr) {
    state.isInStr = false;
    state.trackingTokenStart = true;
  } else {
    onTokenStart(state);
    state.isInStr = true;
    cacheErrorPos(state, ERROR_UNCLOSED_QUOTE);
  }
}

function onBackslash(state) {
  state.isEscaping = true;
  if (!state.isInStr) onTokenStart(state);
}

function afterBackslash(state) {
  state.isEscaping = false;
}

function onSpace(state) {
  if (isInCode(state)) {
    state.trackingTokenStart = true;
  }
}

function isInCode(state) {
  // indicates if we are currently in "code space" (not string or comment)
  return !state.isInComment && !state.isInStr;
}

//------------------------------------------------------------------------------
// Character dispatch
//------------------------------------------------------------------------------

function onChar(state) {
  const ch = state.ch;

  if (state.isEscaping) afterBackslash(state);
  else if (isOpenParen(ch)) onOpenParen(state);
  else if (isCloseParen(ch)) onCloseParen(state);
  else if (ch === DOUBLE_QUOTE) onQuote(state);
  else if (ch === SEMICOLON) onSemicolon(state);
  else if (ch === BACKSLASH) onBackslash(state);
  else if (ch === TAB) onTab(state);
  else if (ch === SPACE) onSpace(state);
  else if (state.trackingTokenStart) onTokenStart(state);
}

//------------------------------------------------------------------------------
// Indentation functions
//------------------------------------------------------------------------------

function onIndent(state) {
  state.trackingIndent = false;
  if (state.hooks.onIndent) {
    state.hooks.onIndent(state);
  }
}

function checkIndent(state) {
  if (state.trackingIndent && state.ch !== SPACE && state.ch !== TAB) {
    onIndent(state);
  }
}

//------------------------------------------------------------------------------
// High-level processing functions
//------------------------------------------------------------------------------

function readChar(state, ch) {
  state.ch = ch;
  checkIndent(state);
  onChar(state);
}

function readLine(state, lineNo) {
  initLine(state);
  for (let x = 0; x < state.lines[lineNo].length; x++) {
    state.x = x;
    readChar(state, state.lines[lineNo][x]);
  }
}

function finalizeState(state) {
  if (state.isInStr) {
    throw error(state, ERROR_UNCLOSED_QUOTE);
  }
  if (state.parenStack.length !== 0) {
    throw error(state, ERROR_UNCLOSED_PAREN);
  }
  state.success = true;

  if (state.hooks.onFinalState) {
    state.hooks.onFinalState(state);
  }
}

function processError(state, e) {
  state.success = false;
  if (e.readerError) {
    delete e.readerError;
    state.error = e;
  } else {
    state.error = { name: ERROR_UNHANDLED, message: e.stack };
  }
}

export function readText(text, hooks) {
  const state = getInitialState(text, hooks);
  try {
    for (let i = 0; i < state.lines.length; i++) {
      state.lineNo = i;
      readLine(state, i);
    }
    finalizeState(state);
  } catch (e) {
    processError(state, e);
  }
  return state;
}
