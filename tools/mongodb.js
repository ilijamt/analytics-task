var debug = require('debug')('gs:tools:mongodb');
var config = require('./../config.js');

var Client = function Client() {
  this.db = null;
  this.client = null;

  this.connect();
};

Client.prototype.connect = function() {
  this.client = require('mongodb').MongoClient;
  var self = this;

  this.client.connect(config.mongodb.url, config.mongodb.options, function(err, db) {
    if (err) {
      debug('Error: %s', err);
      throw err;
    }
    self.db = db;
    debug('Database connection successful');
  });
};

module.exports = new Client();
