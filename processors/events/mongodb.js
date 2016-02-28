var config = require('../../config.js');
var path = require('path');
var ProcessorName = 'mongodb';
var mongo = require(path.join(config.tools.path, 'mongodb.js'));

var Processor = function Processor(data) {
  var isArray = data.constructor === Array;

  if (!isArray) {
    data = [data];
  }

  // convert ts to date object for mongo date,
  // for easier querying, we don't need to store it as a timestamp
  // but we can easily omit this if we want to store it as a number
  data.forEach(function(item) {
    item.timestamp = Math.floor(item.ts / 1000);
    item.ts = new Date(item.ts);
  });

  var collection = mongo.db.collection(config.events.collection);
  collection.insertMany(data, function(err) {
    if (err) {
      console.error(err);
    }
    data = null; // explicitly set so it's cleared on the next gc
  });
};

module.exports = {
  name: ProcessorName,
  process: Processor
};
