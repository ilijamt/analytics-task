var debug = require('debug')('gs:tools:redis');
var config = require('./../config.js');
var redis = require('redis');
var client = null;

switch (config.redis.type) {
  case 'tcp':
    debug('Using: %s:%s', config.redis.tcp.host, config.redis.tcp.port);
    client = redis.createClient(config.redis.tcp.port, config.redis.tcp.host, config.redis.opts);
    break;
  case 'socket':
    debug('Using: %s', config.redis.socket.host);
    client = redis.createClient(config.redis.socket.host, config.redis.opts);
    break;
  default:
    throw new Error('Unknown redis type: ' + config.redis.type);
}

client.on('error', function(err) {
  console.error(err);
});

client.on('connect', function() {
  debug('Redis successfully connected');
});

module.exports = {
  redis: redis,
  client: client
};
