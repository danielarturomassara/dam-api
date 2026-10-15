// Required by the project's root .dependency-cruiser.cjs — a file that is byte-identical in every
// project because the stack is declared in gauntlet.json, not there. dependency-cruiser discovers
// the root file by name, editor integrations included, so the indirection costs nothing.

const {readStack} = require('../stack.cjs');

module.exports = require('./' + readStack() + '.cjs');
