var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var njwt = require('njwt');

//TODO read from config file
var signingKey = "PLACEHOLDER"

var users = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//validate JWTs here
app.use(function(req,res,next) {
  //TODO is headers correct location for token?
  var token = req.headers.token;
  if(token){
    njwt.verify(token,signingKey,function(err,ver){
      if(err){
        req.expired = true;
        next();
      }else{
        req.user = ver.body;
        next();
      }
    });
  } else{
    next();
  }
});

app.use('/', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send({ message: err.message });
});


module.exports = app;
