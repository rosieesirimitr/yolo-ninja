var auth = require('../auth');

var options = {
    timeout:  3000
  , pool:     { maxSockets:  Infinity }
  , headers:  { connection:  "keep-alive" }
};

graph
  .setOptions(options)
  .get("zuck", function(err, res) {
    console.log(res); // { id: '4', name: 'Mark Zuckerberg'... }
  });
	res.render('loggedIn');
}