// Byte-identical in every project: the stack is declared in gauntlet.json and the kit picks the
// rule set. Change rules in gauntlet/config/dependency-cruiser/<stack>.cjs, never here.
module.exports = require('./gauntlet/config/dependency-cruiser/select.cjs');
