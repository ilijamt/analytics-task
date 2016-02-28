/* eslint-disable no-unused-vars */
var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var debug = require('debug')('gs:worker');
var config = require('./config.js');
var path = require('path');
var mongo = require('./tools/mongodb.js');
var redis = require('./tools/redis.js');
var expressHandlers = require(config.express.handlers);
var routes = {};

process.on('message', function(msg) {
  debug('%s | Message from master: %s', process.pid, msg);
});

process.on('exit', function() {
  debug('%s | Exit', process.pid);
});

process.on('error', function() {
  debug('%s | %s', process.pid, arguments);
});

debug('%s | Initializing express', process.pid);

var app = express();
app.use(require('response-time')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.text());
app.use(express.static('public'));

app.use(function(req, res, next) {
  res.setHeader('Worker', process.pid);
  next();
});

app.disable('etag');

app.options('*', require('cors')());

app.set('trust proxy', function(ip) {
  if (ip === '127.0.0.1' || ip === '::ffff' || ip === '::ffff:127.0.0.1') {
    return true;
  }
  return false;
});

app.get('/help', function(req, res) {
  var response = {
    message: 'Move along nothing to see here.',
    routes: {
      '/help': 'Shows the magical help'
    }
  };
  response.routes[config.express.apiEndpoint] = routes;
  res.status(202).send(response);
});

fs.readdir(config.express.routes.path, function(err, files) {
  if (err) {
    throw err;
  }

  // load the routes
  files.forEach(function(file) {
    if (file.indexOf('js') > 0) {
      var route = require(path.join(config.express.routes.path, file));
      routes[route.endpoint] = route.routes;
      app.use(config.express.apiEndpoint + route.endpoint, route.router);
    }
  });

  // handle all unknown requests
  app.all('*', expressHandlers.ErrorHandler404);

  // Error Handler
  app.use(expressHandlers.DefaultErrorHandler);
});

require('http').createServer(app).listen({
  port: config.express.http.port,
  host: '0.0.0.0'
}, function() {
  debug('HTTP Server listening on port: %s, in %s mode', config.express.http.port, app.get('env'));
});
