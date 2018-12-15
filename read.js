// MINIMAL LISP READER
// (adapted from Parinfer)
//
// Parses only the bare minimum to find indentation points and parens
//
// Designed for Clojure, but should work for any syntax having:
// - Parens:     `(round), {curly}, [square]`
// - Comments:   `; comment rest of line`
// - Strings:    `"string"` (multi-line)
// - Characters: `\char`

//------------------------------------------------------------------------------
// Constants / Predicates
//------------------------------------------------------------------------------

// NOTE: this is a performance hack
// The main state object uses a lot of "unsigned integer or null" values.
// Using a negative integer is faster than actual null because it cuts down on
// type coercion overhead.
const UINT_NULL = -999;

const BACKSLASH = "\\";
const BLANK_SPACE = " ";
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
    hooks,

    lines, //                 [string array] - input lines that we process line-by-line, char-by-char
    lineNo: -1, //            [integer] - the current input line number
    x: -1, //                 [integer] - the current input x position of the current character (ch)

    parenStack: [], //        We track where we are in the Lisp tree by keeping a stack (array) of open-parens.
    //                        Stack elements are objects containing keys {ch, x, lineNo}
    //                        whose values are the same as those described here in this state structure.

    isEscaping: false, //     [boolean] - indicates if the next character will be escaped (e.g. `\c`).  This may be inside string, comment, or code.
    isInStr: false, //        [boolean] - indicates if we are currently inside a string
    isInComment: false, //    [boolean] - indicates if we are currently inside a comment

    trackingIndent: false, // [boolean] - are we looking for the indentation point of the current line?
    success: false, //        [boolean] - was the input properly formatted enough to create a valid state?

    error: {
      //                      if 'success' is false, return this error to the user
      name: null, //          [string] - reader's unique name for this error
      message: null, //       [string] - error message to display
      lineNo: null, //        [integer] - line number of error
      x: null, //             [integer] - start x position of error
      extra: {
        name: null,
        lineNo: null,
        x: null
      }
    },
    errorPosCache: {} //     [object] - maps error name to a potential error position
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
  const e = {
    lineNo: state.lineNo,
    x: state.x
  };
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

  if (state.hooks.onInitLine) {
    state.hooks.onInitLine(state);
  }
}

//------------------------------------------------------------------------------
// Misc Utils
//------------------------------------------------------------------------------

function peek(arr, idxFromBack) {
  const maxIdx = arr.length - 1;
  if (idxFromBack > maxIdx) {
    return null;
  }
  return arr[maxIdx - idxFromBack];
}

//------------------------------------------------------------------------------
// Questions about characters
//------------------------------------------------------------------------------

function isOpenParen(ch) {
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

function onOpenParen(state) {
  if (isInCode(state)) {
    const opener = {
      lineNo: state.lineNo,
      x: state.x,
      ch: state.ch
    };
    if (state.hooks.onOpener) {
      state.hooks.onOpener(state, opener);
    }
    state.parenStack.push(opener);
  }
}

function onMatchedCloseParen(state) {
  state.parenStack.pop();
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
    // TODO: handle this somehow
  }
}

function onSemicolon(state) {
  if (isInCode(state)) {
    state.isInComment = true;
  }
}

function onQuote(state) {
  if (state.isInStr) {
    state.isInStr = false;
  } else {
    state.isInStr = true;
    cacheErrorPos(state, ERROR_UNCLOSED_QUOTE);
  }
}

function onBackslash(state) {
  state.isEscaping = true;
}

function afterBackslash(state) {
  state.isEscaping = false;
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
  if (state.trackingIndent && state.ch !== BLANK_SPACE && state.ch !== TAB) {
    onIndent(state);
  }
}

//------------------------------------------------------------------------------
// High-level processing functions
//------------------------------------------------------------------------------

function processChar(state, ch) {
  state.ch = ch;
  checkIndent(state);
  onChar(state);
}

function processLine(state, lineNo) {
  initLine(state);
  for (let x = 0; x < state.lines[lineNo].length; x++) {
    state.x = x;
    processChar(state, state.lines[lineNo][x]);
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
    state.error.name = ERROR_UNHANDLED;
    state.error.message = e.stack;
    throw e;
  }
}

function processText(text, hooks) {
  const state = getInitialState(text, hooks);
  try {
    for (let i = 0; i < state.lines.length; i++) {
      state.lineNo = i;
      processLine(state, i);
    }
    finalizeState(state);
  } catch (e) {
    processError(state, e);
  }
  return state;
}

module.exports = { read: processText, peek, UINT_NULL, isOpenParen };
