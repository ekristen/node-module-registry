const crypto = require('crypto');
const bunyan = require('bunyan');

const pkg = require('../package.json');
const config = require('./config');

const logger = bunyan.createLogger({
  name: pkg.name,
  level: config.logger.level,
  serializers: bunyan.stdSerializers
});

logger.addSerializers({
  req: function reqSerializer (req) {
    req = bunyan.stdSerializers.req(req);

    if (typeof req.headers === 'undefined' || typeof req.headers['authorization'] === 'undefined') {
      return req;
    }

    const [type, value] = req.headers['authorization'].split(' ');

    const hmac = crypto.createHmac('sha256', config.server.secret);

    req.headers['authorization'] = `${type} hmac256:${hmac.update(value).digest('hex')}`;

    return req;
  }
});

module.exports = logger;
