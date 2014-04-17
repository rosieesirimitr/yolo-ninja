//dependencies for each module used
var express = require('express');
var passport = require('passport');
var http = require('http');
var util = require('util');
var path = require('path');
var TwitterStrategy = require('passport-twitter').Strategy;
var handlebars = require('express3-handlebars');
var app = express();
var dotenv = require('dotenv');
dotenv.load();
var graph = require('fbgraph');
var Twit = require('twit');

exports.graph = graph;

//route files to load
var index = require('./routes/index');
var loggedIn = require('./routes/LoggedIn');

//database setup - uncomment to set up your database
//var mongoose = require('mongoose');
//mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/DATABASE1);

//Configures the Template engine
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

//routes
app.get('/', function(req, res){
  res.render("index", { title: "click link to connect" });
});
app.get('/loggedIn', function(req,res) {
	res.render("loggedIn", {title: "logged in"});
});

//authenticate fb
app.get('/auth/facebook', function(req, res) {

  // we don't have a code yet
  // so we'll redirect to the oauth dialog
  if (!req.query.code) {
    var authUrl = graph.getOauthUrl({
        "client_id":     process.env.graph_client_id
     , "redirect_uri":  process.env.redirect_uri
      , "scope":         process.env.scope
    });
    
    if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
      res.redirect(authUrl);
      //console.log("Constructed the OauthURL: "+authURL);
    } else {  //req.query.error == 'access_denied'
      res.send('access denied');
    }
    return;
  }

  // code is set
  // send and get the access token..
  //ONLY after we obtain code from fb
  graph.authorize({
      "client_id":      process.env.graph_client_id
    , "redirect_uri":   process.env.redirect_uri
    , "client_secret":  process.env.graph_client_secret
    , "code":           req.query.code
  }, function (err, facebookRes) {
	console.log("After authorization: " + JSON.stringify(facebookRes))
	console.log("Access Token set: " + graph.getAccessToken())
    res.redirect('/UserHasLoggedIn');
  });
});


// user gets sent here after being authorized
app.get('/UserHasLoggedIn', function(req, res) {
  
  var params = {fields: " email, birthday, location, first_name"};
  graph.get("me", params, function(err, res2) {
	console.log(res2);
	res.render("loggedIn", {
		title: res2.first_name + "is logged in with Facebook",
		"name": res2.first_name,
		"email": res2.email,
		"birthday": res2.birthday,
		"location": res2.location
		   });
  });
});

//twitter stuff
var twitter_consumer_key=         process.env.consumer_key;
var twitter_consumer_secret=      process.env.consumer_secret;
var access_token=        process.env.access_token;
var access_token_secret=  process.env.access_token_secret;

var OAuth = require('oauth', twitter_consumer_key, twitter_consumer_secret).OAuth
  , oauth = new OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      "twitter_consumer_key",
      "twitter_consumer_secret",
      "1.0",
      "http://localhost:3000/auth/twitter/callback",
      "HMAC-SHA1"
    );

app.get('/auth/twitter', function(req, res) {
 
  oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
    if (error) {
      console.log(error);
      res.send("Authentication Failed!");
    }
    else {
      req.session.oauth = {
        token: oauth_token,
        token_secret: oauth_token_secret
      };
      console.log(req.session.oauth);
      res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
    }
  });
 
});

//define route when twitter done authenticating
app.get('/auth/twitter/callback', function(req, res, next) {
 
  if (req.session.oauth) {
    req.session.oauth.verifier = req.query.oauth_verifier;
    var oauth_data = req.session.oauth;
 
    oauth.getOAuthAccessToken(
      oauth_data.token,
      oauth_data.token_secret,
      oauth_data.verifier,
      function(error, oauth_access_token, oauth_access_token_secret, results) {
        if (error) {
          console.log(error);
          res.send("Authentication Failure!");
        }
        else {
          req.session.oauth.access_token = oauth_access_token;
          req.session.oauth.access_token_secret = oauth_access_token_secret;
          console.log(results, req.session.oauth);
          res.send("Authentication Successful");
           res.redirect('loggedIntwit'); //You might actually want to redirect!
        }
      }
    );
  }
  else {
    res.redirect('/loggedIntwit'); // Redirect to login page
  }
 
});


//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});