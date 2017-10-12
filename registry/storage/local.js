const fs = require('fs');
const path = require('path');
const after = require('after');
const mkdirp = require('mkdirp');

const config = require('../config');
const logger = require('../logger').child({component: 'storage/local'});

const CommonStorage = require('./common');

class LocalStorage extends CommonStorage {
  constructor () {
    super();
    mkdirp.sync(`${config.storage.local.path}/npm/registry/v2/blobs`);
  }

  /**
   * getFile
   * @param {String} filename
   * @param {Function} callback
   * @returns {ReadStream}
   */
  getFile (filename, callback) {
    logger.info({filename: filename}, 'getFile');

    const basepath = config.storage.local.path;
    const filepath = `${basepath}/npm/registry/v2/blobs/${filename}`;

    var readStream = fs.createReadStream(filepath);

    readStream.on('error', (err) => {
      logger.fatal({err: err, filename: filename}, 'getFile ReadStream Error');
    });

    callback(null, readStream);
  }

  /**
   * saveFile
   * @param {Array} attachments
   * @param {Function} callback
   */
  saveFile (attachments, callback) {
    logger.info({files: attachments}, 'saveFile');

    var done = after(Object.keys(attachments).length, callback);

    Object.keys(attachments).forEach((a) => {
      const basepath = config.storage.local.path;
      const filename = `${basepath}/npm/registry/v2/blobs/${a}`;
      const filepath = filename.substring(0, filename.lastIndexOf('/'));

      // Make sure the namespace directory exists
      mkdirp(filepath, (err) => {
        if (err) {
          logger.fatal({err: err}, 'unable to create file storage path');
          return done(err);
        }

        fs.writeFile(filename, Buffer.from(attachments[a].data, 'base64'), (err) => {
          if (err) {
            logger.fatal({err: err}, 'unable to save file');
            return done(err);
          }

          return done();
        });
      });
    });
  }

  /**
   * deleteFile
   * @param {String} filename
   * @param {Function} callback
   */
  deleteFile (filename, callback) {
    fs.unlink(path.join(config.storage.local.path, filename), (err) => {
      if (err) {
        logger.fatal({err: err}, 'unable to delete file');
        return callback(err);
      }

      return callback();
    });
  }
}

module.exports = LocalStorage;
