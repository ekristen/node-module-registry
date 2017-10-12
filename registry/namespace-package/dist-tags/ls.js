var util = require('util');
var url = require('url');

var pkgdal = require('../../dal/package');
var auth = require('../../auth');

var logger = require('../../logger').child({component: 'namespace-package/dist-tags/ls'});

module.exports = function namespaceDisttagsLs (req, res, next) {
  pkgdal.get(req.package.id, (err, pkgdata) => {
    if (err) {
      // res.statusCode = 404
      // return res.end(JSON.stringify({error: err.message}))
      return next(err);
    }

    // res.end(JSON.stringify(pkgdata['dist-tags']))
    res.send(pkgdata['dist-tags']);
    return next();
  });
};
