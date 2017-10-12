module.exports = function globalDisttags (req, res, next) {
  // TODO: Possibly cache and passthru instead or redirect?
  const headers = {
    'Location': `https://registry.npmjs.org/-/package/${req.params.package}/dist-tags`
  };

  req.log.info({headers}, 'global-package dist-tags');

  res.writeHead(302, headers);
  res.end();

  return next();
};
