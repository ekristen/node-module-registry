const config = require('rc')('npmregistry', {
  server: {
    host: '0.0.0.0',
    port: 3100,
    secret: 'registry'
  },
  logger: {
    level: 'info'
  },
  settings: {
    allow_previous_version: false
  },
  auth: {
    type: 'none',
    github: {
      host: 'github.com',
      cache: {
        path: './data/github-cache'
      }
    }
  },
  storage: {
    type: 'local',
    local: {
      path: './data/storage'
    },
    s3: {
      accessKeyId: null,
      secretAccessKey: null,
      region: null,
      bucket: null,
      prefix: null,
      redirect: false,
      expires: 60
    }
  }
});

module.exports = config;
