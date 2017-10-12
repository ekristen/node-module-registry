const config = require('../config');
const logger = require('../logger');

const Auth = require('./' + config.auth.type);
module.exports = new Auth(logger);
