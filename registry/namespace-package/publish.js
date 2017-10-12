const errors = require('restify-errors');
const dalpkg = require('../dal/package');

module.exports = function namespacePublish (req, res, next) {
  const logger = req.log.child({component: 'namespace-package/publish'});

  dalpkg.publish(req.body, req.auth.user, (err, result) => {
    if (err && err.message.indexOf('Cannot publish a version') === 0) {
      logger.warn({package: result}, 'cannot publish an already published version');
      return next(new errors.ConflictError(err));
    }

    if (err) {
      logger.fatal({err: err}, 'dalpkg.publish error');
      return next(err);
    }

    logger.info({package: result}, 'publish successful');

    res.send(201);
    return next();
  });
};
