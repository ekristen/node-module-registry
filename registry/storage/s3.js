const _ = require('lodash');
const AWS = require('aws-sdk');
const after = require('after');

// Local Modules
const config = require('../config');
const logger = require('../logger').child({component: 'storage/s3'});

const CommonStorage = require('./common');

// S3 File Storage
class S3Storage extends CommonStorage {
  constructor () {
    super();

    this.s3 = new AWS.S3(config.storage.s3);
  }

  getFile (filename, callback) {
    logger.info({filename: filename}, 'getFile');

    let params = {
      Bucket: config.storage.s3.bucket,
      Key: [config.storage.s3.prefix, `npm/registry/v2/blobs`, filename].join('/')
    };

    logger.debug({params: params}, 'getFile');

    // S3 Supports Redirect, if so send a URL instead of a ReadStream
    if (config.storage.s3.redirect === true || config.storage.s3.redirect === 'true') {
      params.Expires = config.storage.s3.expires;
      const signedUrl = this.s3.getSignedUrl('getObject', params);

      logger.info({url: signedUrl}, 'getFile Redirect');

      return callback(null, signedUrl, true);
    }

    const readStream = this.s3.getObject(params).createReadStream();

    readStream.on('error', (err) => {
      logger.error({err: err}, 'getFile.readStream.error');
    });

    callback(null, readStream);
  }

  saveFile (attachments, callback) {
    const done = after(Object.keys(attachments).length, callback);

    Object.keys(attachments).forEach((a) => {
      const params = {
        Bucket: config.storage.s3.bucket,
        Key: [config.storage.s3.prefix, `npm/registry/v2/blobs`, a].join('/'),
        Body: Buffer.from(attachments[a].data, 'base64')
        // ServerSideEncryption: 'AES256'
      };

      logger.debug({params: _.omit(params, ['Body'])}, 'saveFile S3 Parameters');

      this.s3.putObject(params, (err) => {
        if (err) {
          logger.fatal(err, 'saveFile.putObject.error');
          return done(err);
        }

        logger.info({filename: a}, 'saveFile successful');

        return done(null);
      });
    });
  }

  deleteFile (filename, callback) {
    const params = {
      Bucket: config.storage.s3.bucket,
      Key: [config.storage.s3.prefix, `npm/registry/v2/blobs`, filename].join('/')
    };

    logger.debug({params: params}, 'deleteFile S3 Parameters');

    this.s3.deleteObject(params, (err) => {
      if (err) {
        logger.error(err, 'deleteFile.deleteObject.error');
        return callback(err);
      }

      logger.info({filename: filename}, 'deleteFile successful');

      return callback(null);
    });
  }
}

module.exports = S3Storage;
