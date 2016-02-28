'use strict';
process.env.DEBUG = 'gs:*';

var debug = require('debug')('gs:master');
var npid = require('npid');
var cluster = require('cluster');
var os = require('os');

process.stdin.resume();
process.stdin.setEncoding('utf8');

try {
  var pid = npid.create('./run.pid');
  pid.removeOnExit();
} catch (err) {
  debug('System is running: %s', err);
  process.exit(1);
}

cluster.setupMaster({
  exec: './worker.js',
  silent: false
});

cluster.on('fork', function(worker) {
  debug('%s #%s | Worker has spawned', process.pid, worker.id);
});

cluster.on('online', function(worker) {
  debug('%s #%s | Worker is online', process.pid, worker.id);
});

cluster.on('listening', function(worker, address) {
  debug('%s #%s | Worker is now connected to: %s:%s', process.pid, worker.id, address.address, address.port);
});

cluster.on('disconnect', function(worker) {
  debug('%s #%s | Worker has disconnected', process.pid, worker.id);
});

cluster.on('exit', function(worker) {
  debug('%s #%s | Worker has died, restarting ...', process.pid, worker.id);
  cluster.fork();
});

for (var i = 0; i < os.cpus().length; i++) {
  cluster.fork();
}

var _ref = ['SIGINT', 'SIGQUIT', 'SIGTERM', 'SIGUSR2'];
var signal;
for (var _j = 0, _len = _ref.length; _j < _len; _j++) {
  signal = _ref[_j];
  debug('Binding on event: %s', signal);
  try {
    process.once(signal, function() {
      debug('Shutting down');
      for (var id in cluster.workers) {
        if (cluster.workers.hasOwnProperty(id)) {
          debug('Terminating worker: %s', cluster.workers[id].process.pid);
          cluster.workers[id].disconnect();
        }
      }
      return process.exit(0);
    });
  } catch (err) {
    debug.error('Binding on event: %s has failed with error: %o', signal, err);
  }
}
signal = null;
_ref = null;
