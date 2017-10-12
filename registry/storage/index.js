const config = require('../config');
const Storage = require(`./${config.storage.type}`);
module.exports = new Storage();
