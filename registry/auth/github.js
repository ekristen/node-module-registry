const _ = require('lodash');
const urlparser = require('github-url-parse');
const errors = require('restify-errors');
const request = require('request');
const GitHubAPI = require('github-cache');

const pkg = require('../../../package.json');
const config = require('../config');
const pkgdal = require('../dal/package');
const logger = require('../logger').child({component: 'auth/github'});

function GitHubStrategy () {
  this.github = new GitHubAPI({
    version: '3.0.0',
    cachedb: config.auth.github.cache.path
  });

  return this;
}

GitHubStrategy.prototype.userData = function () {
  var self = this;

  return function GitHubUserData (req, res, next) {
    const logger = req.log.child({component: 'auth/github'});

    self.github.authenticate({
      type: 'oauth',
      token: req.auth.token
    });

    self.github.user.get({}, function (err, user) {
      if (err) {
        logger.error({err: err}, 'github api error');
        return next(err);
      }

      if (typeof user.login === 'undefined') {
        return next(new errors.UnauthorizedErrors('Invalid auth token or user login'));
      }

      req.auth.user = {
        user: user.login,
        name: user.name,
        email: user.email
      };

      logger.info({user: req.auth.user}, 'user info');

      return next();
    });
  };
};

GitHubStrategy.prototype.checkAuth = function (permission) {
  var self = this;

  if (['read', 'write'].indexOf(permission) === -1) {
    throw new Error('invalid permission');
  }

  return function GitHubCheckAuth (req, res, next) {
    const logger = req.log.child({component: 'auth/github'});

    if (typeof req.auth.token === 'undefined') {
      return next(new errors.UnauthorizedError('No valid auth token present'));
    }

    self.github.authenticate({
      type: 'oauth',
      token: req.auth.token
    });

    // 1. Check if we know about the package?
    //  -- if so then we can do auth from DataStore
    // 2. If we don't know the package, then check if we are publishing?
    //  -- if publishing, check the body contents and auth from data

    pkgdal.get(req.package.id, function (err, packageData) {
      if (err) {
        logger.error({err: err}, 'pkgdal.get error');
        return next(err);
      }

      // Package is Unknown, uses the data in the req.body
      if (_.isEmpty(packageData)) {
        return self._urlFromData(req.body, function (err, repoUrl) {
          if (err) {
            logger.error({err: err}, '_urlFromData error');
            return next(err);
          }

          self._verify(repoUrl, permission, next);
        });
      }

      self._urlFromDatastore(req.package.id, function (err, repoUrl) {
        if (err) {
          logger.error({err: err}, '_urlFromDatastore error');
          return next(err);
        }

        self._verify(repoUrl, permission, next);
      });
    });
  };
};

GitHubStrategy.prototype._urlFromData = function (pkgdata, callback) {
  let repoUrl = null;

  logger.info('_urlFromData');

  if (typeof pkgdata.repository !== 'undefined' && typeof pkgdata.repository.url !== 'undefined') {
    repoUrl = pkgdata.repository.url;
  }

  Object.keys(pkgdata.versions).forEach(function (v) {
    var packageData = pkgdata.versions[v];

    if (typeof packageData !== 'undefined' && typeof packageData.repository !== 'undefined' && typeof packageData.repository.url !== 'undefined' && repoUrl === null) {
      repoUrl = packageData.repository.url;
    }
  });

  return callback(null, repoUrl);
};

GitHubStrategy.prototype._urlFromDatastore = function (id, callback) {
  let repoUrl = null;

  logger.info('_urlFromDatastore');

  pkgdal.get(id, function (err, packageData) {
    if (err) {
      logger.error({err: err}, 'pkgdal.get error');
      return callback(err);
    }

    if (_.isEmpty(packageData)) {
      return callback(new Error('request was unauthorized'));
    }

    if (typeof packageData.repository !== 'undefined' && typeof packageData.repository.url !== 'undefined' && repoUrl === null) {
      repoUrl = packageData.repository.url;
    }

    callback(null, repoUrl);
  });
};

GitHubStrategy.prototype._verify = function (repoUrl, permission, callback) {
  const self = this;

  const map = {
    'write': 'push',
    'read': 'pull',
    'admin': 'admin'
  };

  if (repoUrl.indexOf(config.auth.github.host) === -1) {
    return callback(new Error('Repository in package.json does not contain ' + config.auth.github.host + ', unable to authenticate'));
  }

  let repository = urlparser(repoUrl);

  if (repository === null || (repository !== null && typeof repository.repo === 'undefined')) {
    return callback(new Error('Unable to parse repository url in package.json'));
  }

  repository.repo = repository.repo.replace('.git', '');

  self.github.repos.get({
    user: repository.user,
    repo: repository.repo
  }, function (err, repo) {
    if (err) {
      logger.error({err: err}, 'github.repos.get.error');
      return callback(err);
    }

    logger.debug({repo: repo}, 'repo');

    if (typeof repo.message !== 'undefined' && repo.message === 'Moved Permanently') {
      request.get({
        url: repo.url,
        headers: {
          'User-Agent': [pkg.name, pkg.version].join('/')
        }
      }, function (err, res, repoJson) {
        if (err) {
          return callback(self.sendError(res, 401, err));
        }

        try {
          var repo = JSON.parse(repoJson);
        } catch (e) {
          logger.error({err: e}, 'unable to parse json');
          return callback(e);
        }

        if (repo.permissions[map[permission]] === false) {
          return callback(new Error('Insufficient Permissions'));
        }

        return callback(null);
      });
    } else {
      if (typeof repo.permissions === 'undefined') {
        return callback(new Error('Unable to get repo permissions'));
      }

      if (repo.permissions[map[permission]] === false) {
        return callback(new Error('Insufficient Permissions'));
      }

      callback(null);
    }
  });
};

module.exports = GitHubStrategy;
