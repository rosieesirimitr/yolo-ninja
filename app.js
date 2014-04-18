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
var OAuth = require('oauth');

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
  res.render("index");
});
app.get('/loggedIn', function(req,res) {
	res.render("loggedIn");
});

app.get('/loggedIntwit', function(req,res) {
	res.render("loggedIntwit");
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



app.get('/loggedIntwit', function(req, res) {

    var T = new Twit({
    consumer_key:         'process.env.consumer_key'
  , consumer_secret:      'process.env.consumer_secret'
  , access_token:         'process.env.access_token'
  , access_token_secret:  'process.env.access_token_secret'
});
  

  T.get('loggedIntwit', { q: 'banana', count: 100 }, function(req, res) {
	 console.log(res);
	 res.render('loggedIntwit', {
		title: "is logged in with Twitter!",
		"stuff": res.q,
	 });
});
});

//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});