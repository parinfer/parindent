// NPM PUBLISH ENTRY POINT
// (converts our Standard ES module to npm's common.js format)
require = require("esm")(module);
module.exports = require("./indent.js");
