const fs = require('fs');
const mkdirp = require('mkdirp');

const config = require('../config');

const CommonManifest = require('./common');

class LocalManifest extends CommonManifest {
  get (name, callback) {
    const basepath = config.storage.local.path;
    const filename = `${basepath}/npm/registry/v2/manifests/${name}`;
    const filepath = filename.substring(0, filename.lastIndexOf('/'));

    mkdirp(filepath, (err) => {
      if (err) {
        return callback(err);
      }

      fs.readFile(filename, (err, contents) => {
        if (err && err.code === 'ENOENT') {
          err.notFound = true;
        }

        if (err) {
          return callback(err);
        }

        let manifest = null;
        try {
          manifest = JSON.parse(contents.toString());
        } catch (err) {
          return callback(err);
        }

        return callback(null, manifest);
      });
    });
  }

  put (name, contents, callback) {
    const basepath = config.storage.local.path;
    const filename = `${basepath}/npm/registry/v2/manifests/${name}`;
    const filepath = filename.substring(0, filename.lastIndexOf('/'));

    mkdirp(filepath, (err) => {
      if (err) {
        return callback(err);
      }

      fs.writeFile(filename, JSON.stringify(contents), (err) => {
        return callback(err);
      });
    });
  }
}

module.exports = LocalManifest;
