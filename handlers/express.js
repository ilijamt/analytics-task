var config = require('../config.js');
var path = require('path');
var debug = require('debug')('gs:handlers:express');
var NotFoundError = require(path.join(config.errors.path, 'NotFoundError.js'));

module.exports = {
  /**
   * Default 404 Handler for express.js
   *
   * @param {object} req Request
   * @param {object} res Response
   * @param {callback} next Callback
   * @constructor
   */
  ErrorHandler404: function(req, res, next) {
    var err = (new NotFoundError('404'));
    res.status(err.status).json(err.inner);
  },

  /**
   * Default error handler
   *
   * @param {error} err Error message
   * @param {object} req Request
   * @param {object} res Response
   * @constructor
   */
  DefaultErrorHandler: function(err, req, res) {
    var code = 500;
    var msg = {msg: 'Internal Server Error'};

    switch (err.name || err.msg.name) {
      case 'NotFoundError':
        code = err.status;
        msg = err.inner;
        break;
      case 'SyntaxError':
        code = 400;
        msg = {msg: 'Invalid JSON object'};
        break;
      default:
        break;
    }

    res.status(code).json(msg);
  }
};
