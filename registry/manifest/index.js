const config = require('../config');
const Manifest = require(`./${config.storage.type}`);
module.exports = new Manifest();
