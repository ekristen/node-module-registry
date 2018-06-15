const errors = require('restify-errors');
const objhash = require('object-hash');
const dalpkg = require('../dal/package');

module.exports = function namespaceMetadata (req, res, next) {
  const logger = req.log.child({component: 'namespace-package/metadata'});

  req.package.tag = false;

  if (typeof req.params.tag !== 'undefined') {
    req.package.tag = req.params.tag;
  }

  logger.debug({package: req.package}, 'package info');

  dalpkg.get(req.package.id, (err, result) => {
    if (err) {
      logger.fatal({err: err}, 'dalpkg.get error');
      return next(err);
    }

    if (typeof result._id === 'undefined') {
      logger.info({package: result}, 'package not found');
      return next(new errors.NotFoundError('package not found'));
    }

    let resultData = result;

    if (req.package.tag !== false) {
      if (typeof result['dist-tags'][req.package.tag] === 'undefined') {
        logger.warn({package: result}, 'specific version not found');
        return next(new errors.NotFoundError('specific package version not found'));
      }

      resultData = result.versions[result['dist-tags'][req.package.tag]];
    }

    const etag = `"${objhash(result)}"`;

    logger.info({package: resultData}, 'package found');

    if (typeof req.headers['if-none-match'] !== 'undefined' && req.headers['if-none-match'] === etag) {
      logger.info({etag: etag}, 'etag matches');

      res.status(304);
      res.end();
      return next();
    }

    res.set({'etag': etag});
    res.status(200);
    res.json(resultData);
    return next();
  });
};
