// Local Modules
var dalpkg = require('../dal/package');
var logger = require('../logger').child({component: 'namespace-package/delete'});

module.exports = function namespaceDelete (req, res, next) {
  req.package.file = {
    namespace: req.params.file_namespace,
    name: req.params.file_name,
    id: req.params.file_namespace + '/' + req.params.file_name
  };

  logger.debug({package: req.package}, 'package info');

  dalpkg.unpublish(req.package.file.id, (err, result) => {
    if (err) {
      logger.error({err: err}, 'unpublish error');
      return next(err);
    }

    logger.info('delete succesful');

    res.end();
    return next();
  });
};
