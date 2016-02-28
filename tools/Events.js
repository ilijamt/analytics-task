var debug = require('debug')('gs:tools:events');
var config = require('./../config.js');
var path = require('path');
var eventProcessors = require(path.join(config.processors.path, 'events.js'));
var redis = require(path.join(config.tools.path, 'redis.js'));
var mongo = require(path.join(config.tools.path, 'mongodb.js'));
var _ = require("lodash");

var Events = function Events() {
  this.buffer = [];
  this.drain();
};

/**
 * Get all events with paging
 *
 * @param {object} query Filter for the events
 * @param {callback} callback Callback to return the results
 */
Events.prototype.getEventsPaging = function getEvents(query, callback) {
  var collection = mongo.db.collection(config.events.collection);
  var cursor = collection.find(query, {'_id': false});

  cursor.toArray(function(err, docs) {
    callback(err, docs);
  });
}
;
/**
 * Get all events with paging
 *
 * @param {object} query Filter for the events
 * @param {number} page Which page to get
 * @param {number} limit How many items to get
 * @param {callback} callback Callback to return the results
 */
Events.prototype.getEventsPaging = function getEvents(query, page, limit, callback) {
  var collection = mongo.db.collection(config.events.collection);
  page = page || 0;
  query = query || {};

  var cursorCount = collection.find(query, {'_id': false});

  cursorCount.count(function(err, count) {

      var cursor = collection.find(query, {'_id': false});

      cursor.skip(page * limit);
      cursor.limit(limit);

      cursor.toArray(function(err, docs) {
        callback(err, {
          page: page + 1,
          totalPages: Math.ceil(count / limit),
          totalEvents: count,
          events: docs
        });
      });
    }
  );
};

/**
 * Get all stats
 *
 * @param {callback} callback Callback
 */
Events.prototype.getStats = function getStats(callback) {

  redis.client.keys(config.processors.modules.redisStats.baseKey + "*", function(err, obj) {
    if (err) {
      console.error(err);
      return callback(err);
    }

    var queue = [];
    _.each(obj, function(series) {
      queue.push(['hgetall', series]);
    });

    redis.client.multi(queue)
      .exec(function(err, stats) {
        if (err) {
          console.error(err);
          return callback(err);
        }

        // group them by event type and sum them

        var results = {};

        _.each(stats, function(stat) {

          var timestamp = _.clone(stat.__timestamp);
          delete stat.__timestamp;

          _.each(stat, function(count, eventType) {
            results[eventType] = results[eventType] || {};
            results[eventType][timestamp] = parseInt(results[eventType][timestamp]) || 0;
            results[eventType][timestamp] += parseInt(count);
          });
        });

        callback(null, results);
      });
  });
};

/**
 * Drains the buffer, it's set on the interval so it will drain after the buffer is full, or overflowing
 */
Events.prototype.drain = function drain() {
  if (this.buffer.length <= 0) {
    setTimeout(this.drain.bind(this), config.events.drainTimeout);
    return;
  }

  debug('%s | Flushing %s events', process.pid, this.buffer.length);
  eventProcessors.process(this.buffer.splice(0));

  setTimeout(this.drain.bind(this), config.events.drainTimeout);
};

/**
 * Adds an event to the system
 *
 * @param {object} event The event to process
 * @param {string} event.event_type Event type
 * @param {number} event.ts Unix timestamp
 * @param {?object} event.params A key-value dictionary where the key must be a string but the value can be of any data type
 */
Events.prototype.addEvent = function addEvent(event) {
  // convert the ts to DateTime timestamp
  event.ts = parseInt(event.ts, 10);
  this.buffer.push(event);
};

module.exports = new Events();
