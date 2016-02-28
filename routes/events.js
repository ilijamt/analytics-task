/* eslint-disable new-cap, camelcase */
var path = require('path');
var config = require('./../config.js');
var Events = require(path.join(config.tools.path, 'Events.js'));
var _ = require("lodash");

var RouteEntry = function RouteEntry() {
  var router = require('express').Router();
  var route = {
    class: 'events',
    endpoint: '/events',
    routes: [
      {
        uri: '/',
        method: ['GET'],
        description: "Get all the events in the system, this is without any filtering"
      },
      {
        uri: '/query',
        method: ['POST'],
        description: "Get the events from the database",
        parameters: {
          page: "Which page to show",
          limit: "How many items to show per page",
          startDate: "Set a start date in unix timestamp, if empty it will include all items from the start",
          endDate: "Set an end date in unix timestamp, if empty it will include all items until",
          eventType: "If set it will filter by an event, can be an array for multiple events"
        }
      },
      {
        uri: '/',
        method: ['POST'],
        description: 'Register an event',
        required: [
          'event_type'
        ],
        parameters: {
          event_type: 'Type of event being sent',
          ts: 'UNIX timestamp in seconds',
          params: 'A key-value dictionary where the key must be a string but the value can be of any data type'
        }
      }
    ]
  };

  router.post('/query', function(req, res, next) {
    var startDate = parseInt(req.body.startDate) || null;
    var endDate = parseInt(req.body.endDate) || null;
    var eventType = req.body.eventType || null;
    var page = req.body.page || 0;
    var limit = req.body.limit || config.mongodb.defaultPagingLimit;

    page = page > 0 ? page - 1 : page;

    var query = {};

    if (!isNaN(startDate) && startDate !== null) {
      query['ts'] = query['ts'] || {};
      query['ts']['$gte'] = new Date(startDate * 1000);
    }

    if (!isNaN(endDate) && endDate !== null) {
      query['ts'] = query['ts'] || {};
      query['ts']['$lte'] = new Date(endDate * 1000);
    }

    if (eventType !== null && !_.isEmpty(eventType)) {
      query['event_type'] = {'$in': _.isArray(eventType) ? eventType : [eventType]};
    }

    Events.getEventsPaging(query, page, limit, function(err, docs) {
      if (err) {
        return next(err);
      }
      res.status(200).send(docs);
    });
  });

  router
    .get('/stats', function(req, res, next) {
      Events.getStats(function(err, results) {
        if (err) {
          return next(err);
        }
        res.status(200).send(results);
      });
    });

  router
    .post('/', function(req, res) {
      process.nextTick(function() {
        Events.addEvent(req.body);
      });
      res.status(202).send();
    });

  route.router = router;
  return route;
};

module.exports = new RouteEntry();
