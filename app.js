
/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    path = require('path'),
    Sultagit = require('./models/Sultagit.js');

var app = express(),
    server = http.createServer(app);

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
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

var sultagitBasic = new Sultagit.Basic(),
    sultagitLive = new Sultagit.Live(server);

/* define routes */

// index
app.get('/', function (req, res) {
    var isLive = (req.signedCookies.sultagitlive == 'live');
    var title = process.env.NODE_ENV ? 'sultag.it' : 'sultag.it - local';

    res.render('index', {open: "[%", close: "%]", title: title, live: isLive});
});

// live
app.get('/live', basicAuth, function(req, res) {
    res.cookie('sultagitlive', 'live', {signed: true});
    res.redirect('/');
});

// getTags endpoint
app.get('/getTags/:tagName', function (req, res) {
    var isLive = (req.signedCookies.sultagitlive == 'live');
    var sultagit = isLive ? sultagitLive : sultagitBasic;

    sultagit.getTags(req.params.tagName, function(tag) {
        console.log('@app.js.getTags - gotTag', tag);
        res.send(tag);
        if (isLive) {
            sultagitLive.subscribe(req.params.tagName, req.cookies.sultagitSocketId);
        }
    });
});

// getTags Delete
app.delete('/getTags/:tagName', function (req, res) {
    var isLive = (req.signedCookies.sultagitlive == 'live');
    var sultagit = isLive ? sultagitLive : sultagitBasic;
    sultagit.removeTags(req.params.tagName, function (err) {
        if (err) {
            res.send(404, err);
        }
        else {
    res.send(204);
        }
    }, isLive ? req.cookies.sultagitSocketId : null);
});

// handle subscription handshake
app.get('/subscriptions', function (req, res) {
    sultagitLive.subscriptionHandshake(req, res);
});

// get updated data
app.post('/subscriptions', function (req, res) {
    res.send(200);
    sultagitLive.update(req.body);
});

app.use(express.static(path.join(__dirname, 'public')));

server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));

    //when app starts unsubscribe from all exisiting instagram subscriptions
    sultagitLive.unsubscribeAll();
});