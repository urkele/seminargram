
/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    path = require('path'),
    // , sultagitRoute = require('./routes/sultagitRoute.js')
    Sultagit = require('./models/Sultagit.js').Sultagit,
    gramroutes = require('./routes/gramroutes.js');

var app = express(),
    server = http.createServer(app);

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('pictureyourwords2013'));
    app.use(express.session());
    app.use(app.router);
    app.use(require('less-middleware')({ src: __dirname + '/public' }));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

var basicAuth = express.basicAuth(function(username, password) {
  return (username === "sultagit" && password === "123456");
}, 'Please provide credentials');

var sultagit = new Sultagit;

app.get('/', sultagit.getIndex);
app.get('/live', basicAuth, function(req, res) {
    res.cookie('sultagitlive', 'live', { signed: true });
    res.redirect('/');
});
app.get('/subscriptions', gramroutes.handshakeSubscription);
app.post('/subscriptions', gramroutes.gotSubscription);
app.post('/fakesubscriptions', gramroutes.gotSubscription);
app.get('/poster', gramroutes.getPoster);
app.get('/getTags/:tagName', function (req, res) {
    var tn = req.params.tagName;
    sultagit.getTags((req.signedCookies.sultagitlive == 'live'), tn, function(tag) {
        console.log('@sultagit.getTags - gotTag', tag);
        res.send(tag);
    });
});
// app.get('/getTagsDummy/:tagName', sultagit.getDummy)

app.use(express.static(path.join(__dirname, 'public')));


server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
    //when app starts unsubscribe from all exisiting instagram subscriptions
    gramroutes.unsubscribeAll();
});
gramroutes.createSocket(server);