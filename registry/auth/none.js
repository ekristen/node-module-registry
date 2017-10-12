class NoneStrategy {
  userData () {
    return function NoneUserData (req, res, next) {
      req.auth.user = {
        name: 'none',
        user: 'none',
        email: 'none@none'
      };

      req.log.child({component: 'auth/none'}).info({user: req.auth.user}, 'user data');

      return next();
    };
  }

  checkAuth () {
    return function NoneCheckAuth (req, res, next) {
      req.log.child({component: 'auth/none'}).info({req: req}, 'checking authentication');

      return next();
    };
  }
}

module.exports = NoneStrategy;
