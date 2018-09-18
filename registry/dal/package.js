const _ = require('lodash');
const async = require('async');

const config = require('../config');
const manifest = require('../manifest');
const storage = require('../storage');
const merge = require('../package/merge');
const logger = require('../logger').child({component: 'dal/package'});

function getPackage (pkgname, callback) {
  manifest.get(pkgname, function (err, stored) {
    if (err && !err.notFound) {
      logger.error(err, 'leveldb.get error');
      return callback(err);
    }

    if (err && err.notFound) {
      logger.warn({pkgname}, 'not found, returning empty object');
      return callback(null, {});
    }

    logger.info({pkgname}, 'found, returning stored package data');

    callback(null, stored);
  });
}
module.exports.get = getPackage;

function getFile (filename, callback) {
  storage.getFile(filename, callback);
}
module.exports.getFile = getFile;

function publish (pkgdata, user, callback) {
  logger.debug({pkg: pkgdata}, 'dalpkg/publish');

  var storedPkgdata;

  async.series({
    getMetadata: function publishGetMetadata (cb) {
      manifest.get(pkgdata._id, function (err, stored) {
        if (err && !err.notFound) {
          logger.error(err, 'leveldb.get error');
          return cb(err);
        }

        if (err && err.notFound) {
          stored = {};
        }

        logger.debug('publish/getMetadata');

        storedPkgdata = _.clone(stored);
        cb(null);
      });
    },
    checkVersion: function publishCheckVersion (cb) {
      if (config.settings.allow_previous_version === true) {
        return cb();
      }

      if (_.isEmpty(storedPkgdata)) {
        return cb();
      }

      var found = false;

      logger.debug({package: storedPkgdata}, 'checkVersion');

      Object.keys(pkgdata.versions).forEach(function (version) {
        if (typeof storedPkgdata.time[version] !== 'undefined') {
          found = true;
        }
      });

      if (found === true) {
        return cb(new Error('Cannot publish a version that already exists, please increment version'));
      }

      cb();
    },
    saveFile: function publishSaveFile (cb) {
      storage.saveFile(pkgdata._attachments, function (err) {
        if (err) {
          logger.error(err, 'storage.saveFile error');
          return cb(err);
        }

        logger.debug('publish/saveFile success');

        cb(null);
      });
    },
    updateMetadata: function publishUpdateMetadata (cb) {
      manifest.put(pkgdata._id, merge(storedPkgdata, pkgdata, user), function (err) {
        if (err) {
          logger.error(err, 'manifest.save error');
          return cb(err);
        }

        logger.debug('publish/updateMetadata success');

        cb();
      });
    }
  }, function publishSeriesCallback (err) {
    if (err) {
      logger.error(err, 'dal/package.publish error');
      return callback(err);
    }

    logger.debug('publish/finished');

    callback();
  });
}
module.exports.publish = publish;

function unpublish (filename, callback) {
  storage.deleteFile(filename, function (err) {
    if (err) {
      logger.error(err, 'dal/package.unpublish error');
      return callback(err);
    }

    callback();
  });
}
module.exports.unpublish = unpublish;

function revisionUpdate (pkgdata, callback) {
  manifest.put(pkgdata._id, pkgdata, function (err) {
    if (err) {
      logger.error(err, 'manifest.save error');
      return callback(err);
    }

    callback();
  });
}
module.exports.revisionUpdate = revisionUpdate;

function addTag (pkgname, tag, version, callback) {
  getPackage(pkgname, function (err, pkgdata) {
    if (err) {
      logger.error(err, 'addTag.getPackage error');
      return callback(err);
    }

    pkgdata['dist-tags'][tag] = version.replace(/"/g, '');

    manifest.put(pkgdata._id, pkgdata, function (err) {
      if (err) {
        logger.error(err, 'addTag.manifest.save error');
        return callback(err);
      }

      callback();
    });
  });
}
module.exports.addTag = addTag;

function removeTag (pkgname, tag, callback) {
  getPackage(pkgname, function (err, pkgdata) {
    if (err) {
      logger.error(err, 'removeTag.getPackage error');
      return callback(err);
    }

    delete pkgdata['dist-tags'][tag];

    manifest.put(pkgdata._id, pkgdata, function (err) {
      if (err) {
        logger.error(err, 'removeTag.manifest.save error');
        return callback(err);
      }

      callback();
    });
  });
}
module.exports.removeTag = removeTag;
