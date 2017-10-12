const config = require('rc')('registry', {
  server: {
    host: '0.0.0.0',
    port: 3100,
    secret: 'registry'
  },
  logger: {
    level: 'info'
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
  },
  allow_previous_version: true
});

module.exports = config;
