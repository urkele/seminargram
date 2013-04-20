
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , gramroutes = require('./routes/gramroutes.js');

var app = express()
  , server = http.createServer(app);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('bubblefishing'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', gramroutes.getIndex);
app.get('/tags', gramroutes.getInitialData);
app.post('/subscriptions', gramroutes.gotSubscription)


server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
  console.log("new branch");
});
gramroutes.createSocket(server);
