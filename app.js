//dependencies for each module used
var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express3-handlebars');
var app = express();
var dotenv = require('dotenv');
dotenv.load();
var graph = require('fbgraph');

exports.graph = graph;

//route files to load
var index = require('./routes/index');

//database setup - uncomment to set up your database
//var mongoose = require('mongoose');
//mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/DATABASE1);

//Configures the Template engine
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());

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



app.get('/auth/facebook', function(req, res) {

  // we don't have a code yet
  // so we'll redirect to the oauth dialog
  if (!req.query.code) {
    var authUrl = graph.getOauthUrl({
        "client_id":     process.env.graph_client_id
     , "redirect_uri":   dotenv.redirect_uri
      , "scope":         'email, user_about_me, user_birthday, user_location, publish_stream, read_stream, friends_location'
    });

    if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
      res.redirect(authUrl);
    } else {  //req.query.error == 'access_denied'
      res.send('access denied');
    }
    return;
  }

  // code is set
  // we'll send that and get the access token
  graph.authorize({
      "client_id":      process.env.graph_client_id
    , "redirect_uri":   dotenv.redirect_uri
    , "client_secret":  process.env.graph_client_secret
    , "code":           req.query.code
  }, function (err, facebookRes) {
    res.redirect('/loggedIn');
  });


});

// user gets sent here after being authorized
app.get('/loggedIn', function(req, res) {
  res.render("index", { title: "Logged In" });
});


//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});