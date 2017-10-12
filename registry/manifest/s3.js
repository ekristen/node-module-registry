const _ = require('lodash');
const AWS = require('aws-sdk');

const config = require('../config');
const logger = require('../logger').child({component: 'manifest/s3'});

const CommonManifest = require('./common');

// S3 File Storage
class S3Manifest extends CommonManifest {
  constructor () {
    super();

    this.s3 = new AWS.S3(config.storage.s3);
  }

  get (name, callback) {
    logger.info({filename: name}, 'getFile');

    let params = {
      Bucket: config.storage.s3.bucket,
      Key: [config.storage.s3.prefix, `npm/registry/v2/manifests`, name].join('/')
    };

    logger.debug({params: params}, 'getFile');

    this.s3.getObject(params, (err, contents) => {
      if (err && (err.code === 'ENOENT' || err.statusCode === 404)) {
        err.notFound = true;
      }

      if (err) {
        return callback(err);
      }

      let manifest = null;
      try {
        manifest = JSON.parse(contents.Body.toString());
      } catch (err) {
        return callback(err);
      }

      return callback(null, manifest);
    });
  }

  put (name, contents, callback) {
    const params = {
      Bucket: config.storage.s3.bucket,
      Key: [config.storage.s3.prefix, `npm/registry/v2/manifests`, name].join('/'),
      Body: JSON.stringify(contents)
      // ServerSideEncryption: 'AES256'
    };

    logger.debug({params: _.omit(params, ['Body'])}, 'saveFile S3 Parameters');

    this.s3.putObject(params, (err) => {
      if (err) {
        logger.fatal(err, 'saveFile.putObject.error');
        return callback(err);
      }

      logger.info({filename: name}, 'saveFile successful');

      return callback(null);
    });
  }
}

module.exports = S3Manifest;
