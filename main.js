// Our library uses ES Modules
// (we need this bit of glue code to allow it to be used in node.js)
require = require("esm")(module);
module.exports = require("./indent.js");
