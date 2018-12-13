
//------------------------------------------------------------------------------
// Constants / Predicates
//------------------------------------------------------------------------------

// NOTE: this is a performance hack
// The main result object uses a lot of "unsigned integer or null" values.
// Using a negative integer is faster than actual null because it cuts down on
// type coercion overhead.
var UINT_NULL = -999;

var BACKSLASH = '\\',
    BLANK_SPACE = ' ',
    DOUBLE_QUOTE = '"',
    SEMICOLON = ';',
    TAB = '\t';

var LINE_ENDING_REGEX = /\r?\n/;

var MATCH_PAREN = {
  "{": "}",
  "}": "{",
  "[": "]",
  "]": "[",
  "(": ")",
  ")": "("
};

//------------------------------------------------------------------------------
// Result Structure
//------------------------------------------------------------------------------

// This represents the running result. As we scan through each character
// of a given text, we mutate this structure to update the state of our
// system.

function getInitialResult(text) {

  var result = {

    indentFixes: [],

    lines:                     // [string array] - input lines that we process line-by-line, char-by-char
      text.split(LINE_ENDING_REGEX),
    lineNo: -1,                // [integer] - the current input line number
    x: -1,                     // [integer] - the current input x position of the current character (ch)

    parenStack: [],            // We track where we are in the Lisp tree by keeping a stack (array) of open-parens.
                               // Stack elements are objects containing keys {ch, x, lineNo, indentDelta}
                               // whose values are the same as those described here in this result structure.

    isInCode: true,            // [boolean] - indicates if we are currently in "code space" (not string or comment)
    isEscaping: false,         // [boolean] - indicates if the next character will be escaped (e.g. `\c`).  This may be inside string, comment, or code.
    isInStr: false,            // [boolean] - indicates if we are currently inside a string
    isInComment: false,        // [boolean] - indicates if we are currently inside a comment

    trackingIndent: false,     // [boolean] - are we looking for the indentation point of the current line?
    success: false,            // [boolean] - was the input properly formatted enough to create a valid result?

    error: {                   // if 'success' is false, return this error to the user
      name: null,              // [string] - Parindent's unique name for this error
      message: null,           // [string] - error message to display
      lineNo: null,            // [integer] - line number of error
      x: null,                 // [integer] - start x position of error
      extra: {
        name: null,
        lineNo: null,
        x: null
      }
    },
    errorPosCache: {}          // [object] - maps error name to a potential error position
  };

  return result;
}

//------------------------------------------------------------------------------
// Possible Errors
//------------------------------------------------------------------------------

// `result.error.name` is set to any of these
var ERROR_UNCLOSED_QUOTE = "unclosed-quote";
var ERROR_UNCLOSED_PAREN = "unclosed-paren";
var ERROR_UNMATCHED_CLOSE_PAREN = "unmatched-close-paren";
var ERROR_UNMATCHED_OPEN_PAREN = "unmatched-open-paren";
var ERROR_UNHANDLED = "unhandled";

var errorMessages = {};
errorMessages[ERROR_UNCLOSED_QUOTE] = "String is missing a closing quote.";
errorMessages[ERROR_UNCLOSED_PAREN] = "Unclosed open-paren.";
errorMessages[ERROR_UNMATCHED_CLOSE_PAREN] = "Unmatched close-paren.";
errorMessages[ERROR_UNMATCHED_OPEN_PAREN] = "Unmatched open-paren.";
errorMessages[ERROR_UNHANDLED] = "Unhandled error.";

function cacheErrorPos(result, errorName) {
  var e = {
    lineNo: result.lineNo,
    x: result.x,
  };
  result.errorPosCache[errorName] = e;
  return e;
}

function error(result, name) {
  var cache = result.errorPosCache[name];

  var e = {
    parindentError: true,
    name: name,
    message: errorMessages[name],
    lineNo: cache ? cache.lineNo : result.lineNo,
    x: cache ? cache.x : result.x
  };
  var opener = peek(result.parenStack, 0);

  if (name === ERROR_UNMATCHED_CLOSE_PAREN) {
    // extra error info for locating the open-paren that it should've matched
    cache = result.errorPosCache[ERROR_UNMATCHED_OPEN_PAREN];
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

function initLine(result) {
  delete result.errorPosCache[ERROR_UNMATCHED_CLOSE_PAREN];
  delete result.errorPosCache[ERROR_UNMATCHED_OPEN_PAREN];
  delete result.errorPosCache[ERROR_LEADING_CLOSE_PAREN];

  result.indentDelta = 0;
  result.isInComment = false;
  result.isEscaping = false;
  result.trackingIndent = !result.isInStr;
}

//------------------------------------------------------------------------------
// Misc Utils
//------------------------------------------------------------------------------

function clamp(val, minN, maxN) {
  if (minN !== UINT_NULL) {
    val = Math.max(minN, val);
  }
  if (maxN !== UINT_NULL) {
    val = Math.min(maxN, val);
  }
  return val;
}

function peek(arr, idxFromBack) {
  var maxIdx = arr.length - 1;
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

function onOpenParen(result) {
  if (result.isInCode) {
    var opener = {
      lineNo: result.lineNo,
      x: result.x,
      ch: result.ch,
      indentDelta: result.indentDelta,
      childIndentX: UINT_NULL
    };
    result.parenStack.push(opener);
  }
}

function onCloseParen(result) {
  if (result.isInCode) {
    if (isValidCloseParen(result.parenStack, result.ch)) {
      result.parenStack.pop();
    } else {
      throw error(result, ERROR_UNMATCHED_CLOSE_PAREN);
    }
  }
}

function onTab(result) {
  if (result.isInCode) {
    // TODO: handle this somehow
  }
}

function onSemicolon(result) {
  if (result.isInCode) {
    result.isInComment = true;
  }
}

function onQuote(result) {
  if (result.isInStr) {
    result.isInStr = false;
  } else {
    result.isInStr = true;
    cacheErrorPos(result, ERROR_UNCLOSED_QUOTE);
  }
}

function onBackslash(result) {
  result.isEscaping = true;
}

function afterBackslash(result) {
  result.isEscaping = false;
}

//------------------------------------------------------------------------------
// Character dispatch
//------------------------------------------------------------------------------

function onChar(result) {
  var ch = result.ch;

  if (result.isEscaping)        { afterBackslash(result); }
  else if (isOpenParen(ch))     { onOpenParen(result); }
  else if (isCloseParen(ch))    { onCloseParen(result); }
  else if (ch === DOUBLE_QUOTE) { onQuote(result); }
  else if (ch === SEMICOLON)    { onSemicolon(result); }
  else if (ch === BACKSLASH)    { onBackslash(result); }
  else if (ch === TAB)          { onTab(result); }

  result.isInCode = !result.isInComment && !result.isInStr;
}

//------------------------------------------------------------------------------
// Indentation functions
//------------------------------------------------------------------------------

function scanForCode(result, x, lineNo) {
  // TODO:
  // scan characters until reaching non-whitespace
  // if quote or semicolon or end reached, return UINT_NULL
  // else return x
}

function scanForSpace(result, x, lineNo) {
  // TODO:
  // scan characters until reaching space
  // return x
  // if reach end, return line length
}

function isSymbol(str) {
  // TODO:
}

function getOpenerIndentSize(result, opener) {
  if (opener.ch === "[") {
    return 1;
  } else if (opener.ch === "{") {
    return 1;
  } else if (opener.ch === "(") {
    var lineNo = opener.lineNo;
    var codeX = scanForCode(result, opener.x, lineNo);
    if (codeX !== UINT_NULL) {
      var spaceX = scanForSpace(result, codeX, lineNo);
      if (isSymbol(result.lines[lineNo].slice(codeX, spaceX))) {
        var argX = scanForCode(result, spaceX, lineNo);
        if (argX === result.x) {
          return argX - opener.x;
        }
        return 2;
      }
    }
    return 1;
  }
}

function getCorrectIndentX(result) {
  if (result.parenStack.length === 0) return 0;
  var opener = peek(result.parenStack, 0);
  if (opener.childIndentX === UINT_NULL) {
    var indentSize = getOpenerIndentSize(result, opener);
    opener.childIndentX = opener.x + opener.indentDelta + indentSize;
  }
  return opener.childIndentX;
}

function onIndent(result) {
  result.trackingIndent = false;
  const correctIndentX = getCorrectIndentX(result);
  if (result.x !== correctIndentX) {
    result.indentDelta = correctIndentX - result.x;
    result.indentFixes.push({
      lineNo: result.lineNo,
      indentDelta: result.indentDelta
    });
  }
}

function checkIndent(result) {
  if (result.ch !== BLANK_SPACE && result.ch !== TAB) {
    onIndent(result);
  }
}

//------------------------------------------------------------------------------
// High-level processing functions
//------------------------------------------------------------------------------

function processChar(result, ch) {
  result.ch = ch;
  if (result.trackingIndent) {
    checkIndent(result);
  }
  onChar(result);
}

function processLine(result, lineNo) {
  initLine(result);
  var x;
  for (x = 0; x < result.lines[lineNo].length; x++) {
    result.x = x;
    processChar(result, result.lines[lineNo][x]);
  }
}

function finalizeResult(result) {
  if (result.isInStr) {
    throw error(result, ERROR_UNCLOSED_QUOTE);
  }
  if (result.parenStack.length !== 0) {
    throw error(result, ERROR_UNCLOSED_PAREN);
  }
  result.success = true;
}

function processError(result, e) {
  result.success = false;
  if (e.parindentError) {
    delete e.parindentError;
    result.error = e;
  } else {
    result.error.name = ERROR_UNHANDLED;
    result.error.message = e.stack;
    throw e;
  }
}

function processText(text) {
  var result = getInitialResult(text);
  try {
    var i;
    for (i = 0; i < result.lines.length; i++) {
      result.lineNo = i;
      processLine(result, i);
    }
    finalizeResult(result);
  }
  catch (e) {
    processError(result, e);
  }
  return result;
}
