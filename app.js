
/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    path = require('path'),
    Sultagit = require('./models/Sultagit.js');

/* create the web server */
var app = express(),
    server = http.createServer(app);


/* details for the http session store */
var MongoStore = require('connect-mongo')(express),
    mongoUrl = {
    production: 'mongodb://sultagit:hazulit@'+process.env.MONGO_URI,
    development: 'mongodb://sultagit-dev:hazulit@'+process.env.MONGO_URI,
    local: 'mongodb://localhost:27017/sultagit-local'
};

/* configure express */
app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('pictureyourwords2013'));
    app.use(express.session({
        store: new MongoStore({
            url: mongoUrl[process.env.NODE_ENV]
            }),
        secret: 'pictureyourwords2013'}));
    app.use(app.router);
    app.use(require('less-middleware')({ src: __dirname + '/public' }));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

/* configure a basic authenticaion theme using basicAuth middleware */
var basicAuth = express.basicAuth(function(username, password) {
  return (username === "sultagit" && password === "hazulit");
}, 'Please provide credentials');

/* create the two app instances */
var sultagitBasic = new Sultagit.Basic(),
    sultagitLive = new Sultagit.Live(server);

// determine the website's title
switch (process.env.NODE_ENV) {
    case 'local':
        var title = 'sultag.it - local';
        break;
    case 'development':
        var title = 'sultag.it - dev';
        break;
     default:
         var title = 'sultag.it';
         break;
}


/* define routes */

// index
app.get('/',
    function (req, res) {
    if (process.env.NODE_ENV == 'production') {
        res.redirect('/soon');
        return;
    }
    var isLive = (req.signedCookies.sultagitlive == 'live');
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
        if (isLive && !tag.error) {
            sultagitLive.subscribe(req.params.tagName, req.query.sid);
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
    }, req.query.sid ? req.query.sid : null);
});

// instagram real team update callback
app.post('/subscriptions', function (req, res) {
    res.send(200);
    sultagitLive.update(req.body);
});

// handle subscription handshake
app.get('/subscriptions', function (req, res) {
    sultagitLive.subscriptionHandshake(req, res);
});

// unsubscribeAll backdoor
app.get('/unsub', basicAuth, function(req, res) {
    sultagitLive.unsubscribeAll();
    res.send(200);
});

// 'soon' page
app.get('/soon', function (req, res) {
    var ua = req.headers['user-agent'];
    if (ua.indexOf('Android') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) {
        res.render('soon', {open: "[%", close: "%]", title: title, is_mobile: true});
    }
    else {
        res.render('soon', {open: "[%", close: "%]", title: title, is_mobile: false});
    }
});

// signout to delete cookie
app.get('/signout', function (req, res) {
    if (req.signedCookies.sultagitlive) {
        res.clearCookie('sultagitlive');
        res.redirect('/');
    }
    else {
        res.redirect('/');
    }
});

// development backdoors
if (process.env.NODE_ENV !== 'production') {
    app.get('/fakesub', function (req, res) {
        res.send(200);
        var ob = [{object_id: 'sun'}];
        sultagitLive.update(ob);
    });

    app.get('/getData', function (req, res) {
        var data = {};
        sultagitBasic.getData(function (d) {
            data.basic = d;
        });
        sultagitLive.getData(function (d) {
            data.live = d;
        });
        res.send(data);
    });
}

/* define static pages path */
app.use(express.static(path.join(__dirname, 'public')));

/* start listening and fire up the app */
server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));

    //when app starts unsubscribe from all exisiting instagram subscriptions
    sultagitLive.unsubscribeAll();
});