const _ = require('lodash');
const urlparser = require('github-url-parse');
const errors = require('restify-errors');
const request = require('request');
const GitHubApi = require('github');
const GitHubCache = require('github-cache');

const pkg = require('../../package.json');
const config = require('../config');
const pkgdal = require('../dal/package');
const logger = require('../logger').child({component: 'auth/github'});

function GitHubStrategy () {
  const githubApi = new GitHubApi({
    version: '3.0.0',
    validateCache: true,
  });

  this.github = new GitHubCache(githubApi, {
    cachedb: config.auth.github.cache.path
  });

  return this;
}

GitHubStrategy.prototype.userData = function () {
  var self = this;

  return function GitHubUserData (req, res, next) {
    const logger = req.log.child({component: 'auth/github'});

    if (req.auth === null) {
      return next(new errors.UnauthorizedError('No valid auth token present, v1'));
    }

    if (typeof req.auth.token === 'undefined') {
      return next(new errors.UnauthorizedError('No valid auth token present, v2'));
    }

    self.github.authenticate({
      type: 'oauth',
      token: req.auth.token
    });

    self.github.users.get({}, function (err, user) {
      if (err) {
        logger.error({err: err}, 'github api error');
        
        if (err.code && err.code === 401) {
          return next(new errors.UnauthorizedError('github unauthorized'));
        }

        return next(err);
      }

      if (typeof user.data.login === 'undefined') {
        return next(new errors.UnauthorizedError('Invalid auth token or user login'));
      }

      req.auth.user = {
        user: user.data.login,
        name: user.data.name,
        email: user.data.email
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

      // Catch invalid / missing packages when it isn't a new one!
      if (_.isEmpty(packageData) && req.method !== 'POST') {
        return next(new errors.NotFoundError('requsted package not found'));
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

      // Package is known, lets get it from the database
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
    owner: repository.user,
    repo: repository.repo
  }, function (err, repo) {
    if (err) {
      logger.error({err: err}, 'github.repos.get.error');
      return callback(err);
    }

    logger.debug({repo: repo}, 'repo');

    if (typeof repo.data.message !== 'undefined' && repo.data.message === 'Moved Permanently') {
      request.get({
        url: repo.data.url,
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

        if (repo.data.permissions[map[permission]] === false) {
          return callback(new Error('Insufficient Permissions'));
        }

        return callback(null);
      });
    } else {
      if (typeof repo.data.permissions === 'undefined') {
        return callback(new Error('Unable to get repo permissions'));
      }

      if (repo.data.permissions[map[permission]] === false) {
        return callback(new Error('Insufficient Permissions'));
      }

      callback(null);
    }
  });
};

module.exports = GitHubStrategy;
