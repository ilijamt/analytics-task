var config = require('../../config.js');
var ProcessorName = 'redis-stats';
var path = require('path');
var redis = require(path.join(config.tools.path, 'redis.js'));
var _ = require('lodash');
var eventStoreKey = _.template(config.processors.modules.redisStats.statsTemplateName);
var moment = require('moment');

var groupByTimeHandler = function(event) {
  var eventTimestamp = new Date(event[config.processors.modules.redisStats.timestampKey]);
  var year = eventTimestamp.getUTCFullYear();
  var month = eventTimestamp.getUTCMonth();
  var day = eventTimestamp.getUTCDate();
  var hours = eventTimestamp.getUTCHours();
  var minutes = eventTimestamp.getUTCMinutes();
  var seconds = eventTimestamp.getUTCSeconds();
  var milliseconds = 0;
  var reminder = 0;
  var divisor = 0;
  var target = config.processors.modules.redisStats.grouping[0];
  var interval = config.processors.modules.redisStats.grouping[1];

  switch (target) {
    case 'seconds':
      divisor = Math.floor(seconds / interval);
      reminder = seconds % interval;
      if (reminder === 0) {
        seconds = divisor * interval;
      } else {
        seconds = 0;
      }
      break;
    case 'minutes':
      seconds = 0;
      divisor = Math.floor(minutes / interval);
      reminder = minutes % interval;
      if (reminder === 0) {
        minutes = divisor * interval;
      } else {
        minutes = 0;
      }
      break;
    default:
      seconds = 0;
      minutes = 0;
      break;
  }

  return Date.UTC(year, month, day, hours, minutes, seconds, milliseconds);
};

var Processor = function Processor(data) {
  var isArray = data.constructor === Array;

  if (!isArray) {
    data = [data];
  }

  var groupedEventsByType = _.groupBy(data, function(event) {
    return event.event_type;
  });

  var queue = [];

  _.each(groupedEventsByType, function(events, event) {
    var groupedEvents = _.groupBy(events, groupByTimeHandler);
    _.each(groupedEvents, function(events, timestamp) {
      var timestampKey = moment(parseInt(timestamp)).format('X');
      var period = config.processors.modules.redisStats.ttl[0];
      var add = config.processors.modules.redisStats.ttl[1];
      var expireAt = moment(parseInt(timestamp)).add(add, period).format('X');
      var key = eventStoreKey({timestamp: timestampKey});
      // this can be further optimized to check if the key exists and if it doesn't create it and then set the TTL
      queue.push(['hmset', key, '__timestamp', timestampKey], ['hincrby', key, event, events.length], ['expireat', key, expireAt]);
    });
  });

  redis.client.multi(queue)
    .exec(function(err, replies) {
      if (err) {
        console.error(err);
      }
      data = null; // explicitly set so it's cleared on the next gc
      groupedEventsByType = null; // explicitly set so it's cleared on the next gc
    });
};

module.exports = {
  name: ProcessorName,
  process: Processor
};
