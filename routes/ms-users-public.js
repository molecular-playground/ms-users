var express = require('express');
var router = express.Router();
var db = require('../lib/db.js');
var bcrypt = require('bcrypt-nodejs');
var request = require('request');
var MS_EMAIL_URL = "http://msemail:3000";
var MS_FRONTEND_URL = "http://msfrontend:3000";

// get users listing
router.get('/', function(req, res, next) {
  db.query('SELECT username FROM users', function(err, result){
    if(err) {next(err);return;}
    res.send(result.rows);
  });
});

// get specific user
router.get('/:username', function(req, res, next) {
  var qString = 'SELECT * FROM users WHERE username = $1';
  var username = req.params.username;
  db.query({text: qString, values: [username]}, function(err, result){
    if(err) {next(err);return;}
    if(result.rows) res.send(result.rows[0]);
    else{
      var err = new Error("User not found");
      err.status = 400;
      next(err);
    }
  });
});

// create user
router.put('/', function(req, res, next) {
  // http://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
  function randomString(length) {
    return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
  }
  var validationURL = randomString(30);
  var username =  req.body.username;
  var email =     req.body.email;
  var location =  req.body.location
  var password = req.body.password;
  var salt = bcrypt.genSaltSync(10);
  if(validationURL && username && email && password){
    bcrypt.genSalt(10, function(err, salt){
      bcrypt.hash(password, salt, null, function(err, hash){
        var qString = 'INSERT INTO users (username, email, password, validation_url, location) VALUES ($1, $2, $3, $4, $5)';
        db.query({text: qString, values: [username, email, hash, validationURL, location]}, function(err, success){
          if(err) {next(err);return;}
          var reqParams = {
	            url: MS_EMAIL_URL + '/validate',
	            method: 'PUT',
	            json: true,
	            body: {
                email: email,
                link: MS_FRONTEND_URL + "/validate?email=" + email + "&key=" + validationURL
              }
          };
          request(reqParams, function (error, response, body) {
            if(error) {next(error);return;}
      			res.send({
              success: true
            });
        	});
        });
      });
    });
  } else {
    var err = new Error("Didn't recieve required information");
    err.status = 400;
    next(err);
  }
});

// Validate a user. Takes a username and a url (aka 'key')
// that was emailed during the creation process and
// updates the 'validated' column in the user's db object.
router.post('/validate', function(req, res, next){
  var email = req.body.email;
  var key = req.body.key;
  if(email && key){
    var qString = 'SELECT validation_url FROM users WHERE email = $1';
    db.query({text: qString, values: [email]}, function(err, results){
      if(err) {next(err);return;}
      if(results.rows[0] && (key === results.rows[0].validation_url)){
        var qString2 = 'UPDATE users SET validated=TRUE WHERE email = $1';
        db.query({text: qString2, values: [email]}, function(err, success){
          if(err) {
            next(err);
            return;
          }
          else {
            res.send({
              success: true,
              message: "Validated " + email
            });
          }
        });
      } else { //if(results.rows[0] && (key === results.rows[0].validation_url))
        var err = new Error("Invalid validation token");
        err.status = 400;
        next(err);
        return;
      }
    });
  }
  else { //if(email && key)
    var err = new Error("Did not recieve required information");
    err.status = 400;
    next(err);
    return;
  }
});

module.exports = router;
