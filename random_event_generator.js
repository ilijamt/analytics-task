/* eslint-disable camelcase */
var async = require('async');
var request = require('request');
var events = ['session_start', 'session_end', 'link_clicked', 'random_event'];
var _ = require('lodash');
var moment = require('moment');
var ProgressBar = require('progress');

var startDate = moment().subtract(1, 'days');
var endDate = moment();

var startTime = startDate.format('X');
var endTime = endDate.format('X');

var yargs = require('yargs')
  .usage('Usage: $0 <options>')
  .demand('uri')
  .alias('u', 'uri')
  .describe('u', 'Full URI to the API')
  .describe('total', 'How many events to send')
  .default('total', 100)
  .describe('startTime', 'Start timestamp (default: Now - 1day')
  .default('startTime', startTime)
  .describe('endTime', 'End timestamp (default: Now)')
  .default('endTime', endTime)
  .describe('concurrency', 'Concurrency')
  .default('concurrency', 100)
  .help('h');

var argv = yargs.argv;

/**
 * Create a random object
 *
 * @param {number} fieldCount How many fields to generate
 * @param {boolean} allowNested Should there be nested fields
 * @return {{}} A randomly generated object
 */
function createRandomObj(fieldCount, allowNested) {
  var generatedObj = {};

  for (var i = 0; i < fieldCount; i++) {
    var generatedObjField;

    switch (randomInt(allowNested ? 6 : 5)) {

      case 0:
        generatedObjField = randomInt(1000);
        break;

      case 1:
        generatedObjField = Math.random();
        break;

      case 2:
        generatedObjField = Math.random() < 0.5;
        break;

      case 3:
        generatedObjField = randomString(randomInt(4) + 4);
        break;

      case 4:
        generatedObjField = null;
        break;

      case 5:
        generatedObjField = createRandomObj(fieldCount, allowNested);
        break;

      default:
        break;
    }
    generatedObj[randomString(8)] = generatedObjField;
  }
  return generatedObj;
}

/**
 * Generate random int
 * @param {number} rightBound Right number boundary
 * @return {number} A random integer
 */
function randomInt(rightBound) {
  return Math.floor(Math.random() * rightBound);
}

/**
 * Create random string
 *
 * @param {number} size Random string size
 * @return {string} A random string
 */
function randomString(size) {
  var alphaChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var generatedString = '';
  for (var i = 0; i < size; i++) {
    generatedString += alphaChars[randomInt(alphaChars.length)];
  }

  return generatedString;
}

argv.startTime = parseInt(argv.startTime, 10) * 1000;
argv.endTime = parseInt(argv.endTime, 10) * 1000;

var iteration = 0;
var elementsPerIteration = argv.concurrency;
var iterations = Math.ceil(argv.total / argv.concurrency);

console.log('Generating ' + argv.total + ' elements, with concurrency of ' +
  argv.concurrency + ', between ' + new Date(argv.startTime) + ' and ' + new Date(argv.endTime));

var randomIntBetween = function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

var bar = new ProgressBar('[:bar] :percent :etas', {
  width: 50,
  total: iterations
});

var processRequests = function() {
  async.timesLimit(elementsPerIteration, argv.concurrency, function(item, callback) {
    request.post({
      url: argv.uri,
      form: {
          event_type: _.sample(events),
          ts: randomIntBetween(argv.startTime, argv.endTime),
          params: createRandomObj(randomIntBetween(0, 5))
        }
    },
      function() {
        callback();
      });
  }, function(err) {
    if (err) {
      console.error(err);
    }
    iteration++;
    bar.tick();
    if (iteration < iterations) {
      process.nextTick(function() {
        processRequests();
      });
    } else {
      console.log('Finished');
    }
  });
};

processRequests();
