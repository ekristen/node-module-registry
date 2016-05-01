var pkg = require('../package.json')

// Installed Modules
var restify = require('restify')
var http_auth_parser = require('http-auth-parser')

// Local Modules
var config = require('config')
var logger = require('logger')
var auth = require('auth')

// Lets Restify
var server = restify.createServer({
  name: pkg.name,
  version: pkg.version
})

server.pre(function decodeURI (req, res, next) {
  req.url = decodeURIComponent(req.url)
  return next()
})

server.use(restify.authorizationParser())
server.use(restify.queryParser())
server.use(restify.bodyParser({ mapParams: false }))

server.use(function httpAuthParser (req, res, next) {
  http_auth_parser(req)
  return next()
})

server.use(auth.userData())

server.use(function packageParser (req, res, next) {
  if (typeof req.params.namespace !== 'undefined' && req.params.package !== 'undefined') {
    req.package = {
      namespace: req.params.namespace,
      name: req.params.package,
      id: req.params.namespace + '/' + req.params.package
    }

    logger.debug({package: req.package}, 'package information')
  }

  return next()
})

server.on('after', restify.auditLogger({
  log: logger.child({component: 'audit'})
}))

server.get('/', function rootHandler (req, res, next) {
  res.send({
    name: pkg.name,
    version: pkg.version
  })
  return next()
})

// Global Endpoints
server.get('/:package', require('global-package/metadata'))
server.get('/-/package/:package/dist-tags', require('global-package/dist-tags'))

// Metadata Endpoints
server.get('/:namespace/:package', auth.checkAuth('read'), require('namespace-package/metadata'))
server.get('/:namespace/:package/:tag', auth.checkAuth('read'), require('namespace-package/metadata'))

// Publish Endpoint
server.put('/:namespace/:package', auth.checkAuth('write'), require('namespace-package/publish'))

// Download Endpoint
server.get('/:namespace/:package/-/:file_namespace/:file_name', auth.checkAuth('read'), require('namespace-package/download'))

// Revision Endpoint
server.put('/:namespace/:package/-rev/:revision', auth.checkAuth('read'), require('namespace-package/revision'))

// Delete Endpoint
server.del('/:namespace/:package/-/:file_namespace/:file_name/-rev/:revision', auth.checkAuth('write'), require('namespace-package/delete'))

// Dist-Tag Endpoints
server.get('/-/package/:namespace/:package/dist-tags', auth.checkAuth('read'), require('namespace-package/dist-tags/ls'))
server.put('/-/package/:namespace/:package/dist-tags/:tag', auth.checkAuth('write'), require('namespace-package/dist-tags/add'))
server.del('/-/package/:namespace/:package/dist-tags/:tag', auth.checkAuth('write'), require('namespace-package/dist-tags/rm'))

// Listen Up!
server.listen(config.port, config.host, function () {
  logger.info('up and running')
})
