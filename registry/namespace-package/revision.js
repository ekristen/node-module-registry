const errors = require('restify-errors');
const dalpkg = require('../dal/package');

module.exports = function namespaceRevision (req, res, next) {
  const logger = req.log.child({component: 'namespace-package/revision'});

  if (typeof req.params.revision === 'undefined') {
    return next(new errors.MissingParameterError('revision is a required parameter'));
  }

  req.package.revision = req.params.revision;

  logger.debug(req.package, 'package information');

  dalpkg.revisionUpdate(req.body, (err) => {
    if (err) {
      logger.fatal({err: err}, 'dalpkg.revisionUpdate error');
      return next(err);
    }

    logger.info('revision update successful');

    res.end();
    return next();
  });
};
