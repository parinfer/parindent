// MINIMAL LISP INDENTER
// (using the MINIMAL LISP READER)
//
// Fix the indentation of every line using very simple rules.
//

//------------------------------------------------------------------------------
// Reader hooks
//------------------------------------------------------------------------------

function onInitLine(result) {
  result.indentDelta = 0;
}

function onOpener(result, opener) {
  opener.indentDelta = result.indentDelta;
  opener.childIndentX = UINT_NULL;
}

function onIndent(result) {
  const correctIndentX = getCorrectIndentX(result);
  if (result.x !== correctIndentX) {
    result.indentDelta = correctIndentX - result.x;
    result.indentFixes.push({
      lineNo: result.lineNo,
      indentDelta: result.indentDelta
    });
  }
}

//------------------------------------------------------------------------------
// Indentation correction
//------------------------------------------------------------------------------

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

//------------------------------------------------------------------------------
// Extra reader code
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
