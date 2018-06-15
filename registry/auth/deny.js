const errors = require('restify-errors');

class DenyStrategy {
  userData () {
    return function DenyUserData (req, res, next) {
      req.auth.user = {
        name: 'deny',
        user: 'deny',
        email: 'deny@deny'
      };

      req.log.child({component: 'auth/deny'}).info({user: req.auth.user}, 'user data');

      return next();
    };
  }

  checkAuth () {
    return function DenyCheckAuth (req, res, next) {
      req.log.child({component: 'auth/deny'}).info({req: req}, 'checking authentication');

      return next(new errors.UnauthorizedError('authentication denied, this is the auth plugin'));
    };
  }
}

module.exports = DenyStrategy;
