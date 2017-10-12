const errors = require('restify-errors');
const pkgdal = require('../../dal/package');

module.exports = function namespaceDisttagsRm (req, res, next) {
  const logger = req.log.child({component: 'namespace-package/dist-tags/rm'});

  if (typeof req.params.tag === 'undefined') {
    return next(new errors.MissingParameterError('tag is a required parameter'));
  }

  req.package.tag = req.params.tag;

  pkgdal.removeTag(req.package.id, req.params.tag, (err) => {
    if (err) {
      return next(err);
    }

    res.end();
    return next();
  });
};
