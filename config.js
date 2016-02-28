/* eslint-disable quote-props */
var path = require('path');

module.exports = {
  'redis': {
    'type': 'tcp',
    'tcp': {
      'host': '127.0.0.1',
      'port': 6379
    },
    'socket': {
      'host': '/tmp/redis.sock'
    },
    'opts': {
      'detect_buffers': true
    }
  },
  tools: {
    path: path.join(__dirname, process.env.DIR_TOOLS || './tools')
  },
  processors: {
    'path': path.join(__dirname, process.env.DIR_PROCESSORS_EVENTS || './processors'),
    'concurrency': 5,
    'modules': {
      'jsonFile': {
        path: path.join(__dirname, process.env.DIR_MODULE_JF_PATH || 'data')
      },
      'redisStats': {
        'baseKey': 'stats:events:',
        'statsTemplateName': 'stats:events:<%= timestamp %>',
        'grouping': ['seconds', 30],
        'timestampKey': 'ts',
        'ttl': ['hours', 48]
      }
    }
  },
  events: {
    collection: 'events',
    drainTimeout: parseInt(process.env.DRAIN_TIMEOUT | 500, 10)
  },
  mongodb: {
    url: 'mongodb://localhost:27017/gs',
    options: null,
    defaultPagingLimit: 50
  },
  errors: {
    path: path.join(__dirname, (process.env.DIR_ERRORS || './errors'))
  },
  express: {
    apiEndpoint: '/api',
    handlers: path.join(__dirname, (process.env_EXPRESS_HANDLER || './handlers/express.js')),
    routes: {
      path: path.join(__dirname, (process.env.DIR_ROUTES || './routes'))
    },
    http: {
      port: process.env.LISTEN_PORT || 3000
    }
  }
};
