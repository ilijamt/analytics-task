var _ = require('lodash');
var async = require('async');
var config = require('../config.js');

var processors = {
  jsonFile: require('./events/jsonFile.js'),
  mongodb: require('./events/mongodb.js'),
  redisStats: require('./events/redisStats.js')
};

var processorNames = Object.keys(processors);

module.exports = {
  /**
   * Go over all the processors and invoke process function
   *
   * @param {object|array} data The event data to store
   */
  process: function(data) {
    async.eachLimit(processorNames, config.processors.concurrency, function(processor, callback) {
      processors[processor].process(_.cloneDeep(data));
      callback();
    }, function(err) {
      if (err) {
        console.error(err);
      }
    });
  }
};
