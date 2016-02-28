var config = require('../../config.js');
var ProcessorName = 'json-file';
var SnowflakeGenerator = new (require('flake-idgen'))();
var intformat = require('biguint-format');
var path = require('path');
var fs = require('fs');
var dataPath = config.processors.modules.jsonFile.path;

var Processor = function Processor(data) {
  var isArray = data.constructor === Array;

  if (!isArray) {
    data = [data];
  }

  SnowflakeGenerator.next(function(err, id) {
    if (err) {
      console.error(err);
      return;
    }

    var jsonFile = path.join(dataPath, intformat(id, 'dec') + '.json');
    var json = JSON.stringify(data);

    fs.writeFile(jsonFile, json, function(err) {
      if (err) {
        console.error(err);
      }
      data = null; // explicitly set so it's cleared on the next gc
      json = null; // explicitly set so it's cleared on the next gc
    });
  });
};

module.exports = {
  name: ProcessorName,
  process: Processor
};
