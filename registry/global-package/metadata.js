module.exports = function globalMetadata (req, res, next) {
  // TODO: Possibly cache and passthru instead of redirect?
  const headers = {
    'Location': `https://registry.npmjs.org/${req.params.package}`
  };

  req.log.info({headers}, 'global-package metadata');

  res.writeHead(302, headers);
  res.end();

  return next();
};
