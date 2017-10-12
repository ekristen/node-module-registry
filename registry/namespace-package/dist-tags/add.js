const errors = require('restify-errors');
const pkgdal = require('../../dal/package');

module.exports = function namespaceDisttagsAdd (req, res, next) {
  const logger = req.log.child({component: 'namespace-package/dist-tags/add'});

  if (typeof req.params.tag === 'undefined') {
    return next(errors.MissingParameterError('tag parameter required'));
  }

  req.package.tag = req.params.tag;

  logger.debug({package: req.package}, 'dist-tag add');

  pkgdal.addTag(req.package.id, req.package.tag, req.body, (err) => {
    if (err) {
      logger.fatal({err: err}, 'addTag error');
      return next(err);
    }

    logger.info('dist-tag added');

    res.end();
    return next();
  });
};
