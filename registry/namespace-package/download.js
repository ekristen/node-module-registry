// Local Modules
var dalpkg = require('../dal/package');
var logger = require('../logger').child({component: 'namespace-package/download'});

module.exports = function namespaceDownload (req, res, next) {
  req.package.file = {
    namespace: req.params.file_namespace,
    name: req.params.file_name,
    id: req.params.file_namespace + '/' + req.params.file_name
  };

  logger.debug({package: req.package}, 'package info');

  dalpkg.getFile(req.package.file.id, (err, stream, redirect) => {
    if (err) {
      logger.error({err: err}, 'dalpkg.getFile error');
      return next(err);
    }

    if (redirect === true) {
      logger.info({url: stream}, 'deliver file via url redirect');

      res.writeHead(302, {
        'Location': stream
      });

      res.end();
      return next();
    }

    logger.info({stream: true}, 'deliver file via stream');

    stream.on('error', (err) => {
      logger.error({err: err}, 'stream error');
      return next(err);
    });

    stream.pipe(res);
  });
};
