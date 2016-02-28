/* eslint-disable new-cap, camelcase */
var path = require('path');
var config = require('./../config.js');
var Events = require(path.join(config.tools.path, 'Events.js'));
var _ = require('lodash');

var RouteEntry = function RouteEntry() {
  var router = require('express').Router();
  var route = {
    class: 'stats',
    endpoint: '/stats',
    routes: [
      {
        uri: '/:type?',
        method: ['GET'],
        description: 'Gets the stats for the latest ' + config.processors.modules.redisStats.ttl[1] + config.processors.modules.redisStats.ttl[0],
        params: {
          ':type': 'Can be any event type we need'
        }
      }
    ]
  };

  router
    .get('/:type?', function(req, res, next) {
      var type = req.params.type;
      Events.getStats(function(err, results) {
        if (err) {
          return next(err);
        }
        if (_.isEmpty(type)) {
          res.status(200).send(results);
        } else {

          if (_.isEmpty(results[type])) {
            res.status(404).send();
          } else {
            var obj = {};
            obj[type] = results[type];
            res.status(200).send(obj);
          }
        }
      });
    });

  route.router = router;
  return route;
};

module.exports = new RouteEntry();
