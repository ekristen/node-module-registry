const restify = require('restify');

const pkg = require('../package.json');
const config = require('./config');
const logger = require('./logger');
const auth = require('./auth');

// Lets Restify
const server = restify.createServer({
  name: pkg.name,
  version: pkg.version
});

server.pre(function decodeURI (req, res, next) {
  req.url = decodeURIComponent(req.url);
  return next();
});

server.use(restify.plugins.authorizationParser());
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser({ mapParams: false }));

server.use(function httpAuthParser (req, res, next) {
  require('http-auth-parser')(req);
  return next();
});

server.use(auth.userData());

server.use(function packageParser (req, res, next) {
  if (typeof req.params.namespace !== 'undefined' && req.params.package !== 'undefined') {
    req.package = {
      namespace: req.params.namespace,
      name: req.params.package,
      id: `${req.params.namespace}/${req.params.package}`
    };

    req.log.debug({package: req.package}, 'request package information');
  }

  return next();
});

server.on('after', restify.plugins.auditLogger({
  event: 'after',
  log: logger.child({component: 'audit'})
}));

server.on('uncaughtException', (req, res, route, err) => {
  req.log.fatal({err}, 'uncaughtException');
  res.send(500, err.message);
});

server.get('/', function rootHandler (req, res, next) {
  res.send({
    name: pkg.name,
    version: pkg.version
  });
  return next();
});

// Global Endpoints
server.get('/:package', require('./global-package/metadata'));
server.get('/-/package/:package/dist-tags', require('./global-package/dist-tags'));

// Metadata Endpoints
server.get('/:namespace/:package', auth.checkAuth('read'), require('./namespace-package/metadata'));
server.get('/:namespace/:package/:tag', auth.checkAuth('read'), require('./namespace-package/metadata'));

// Publish Endpoint
server.put('/:namespace/:package', auth.checkAuth('write'), require('./namespace-package/publish'));

// Download Endpoint
server.get('/:namespace/:package/-/:file_namespace/:file_name', auth.checkAuth('read'), require('./namespace-package/download'));

// Revision Endpoint
server.put('/:namespace/:package/-rev/:revision', auth.checkAuth('read'), require('./namespace-package/revision'));

// Delete Endpoint
server.del('/:namespace/:package/-/:file_namespace/:file_name/-rev/:revision', auth.checkAuth('write'), require('./namespace-package/delete'));

// Dist-Tag Endpoints
server.get('/-/package/:namespace/:package/dist-tags', auth.checkAuth('read'), require('./namespace-package/dist-tags/ls'));
server.put('/-/package/:namespace/:package/dist-tags/:tag', auth.checkAuth('write'), require('./namespace-package/dist-tags/add'));
server.del('/-/package/:namespace/:package/dist-tags/:tag', auth.checkAuth('write'), require('./namespace-package/dist-tags/rm'));

module.exports = server;

if (require.main === module) {
  // Listen Up Restify!
  server.listen(config.server.port, config.server.host, function () {
    logger.info(`up and running, listening at ${config.server.host}:${config.server.port}`);
  });
}
