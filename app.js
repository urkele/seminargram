
/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    path = require('path'),
    Sultagit = require('./models/Sultagit.js');

var app = express(),
    server = http.createServer(app),
    MongoStore = require('connect-mongo')(express);

var mongoUrl = {
    production: 'mongodb://sultagit:hazulit@'+process.env.MONGO_URI,
    development: 'mongodb://sultagit-dev:hazulit@'+process.env.MONGO_URI,
    local: 'mongodb://localhost:27017/sultagit-local'
};

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

var basicAuth = express.basicAuth(function(username, password) {
  return (username === "sultagit" && password === "hazulit");
}, 'Please provide credentials');

var sultagitBasic = new Sultagit.Basic(),
    sultagitLive = new Sultagit.Live(server);

/* define routes */

// index

/*app.get('/', function(req, res) {
    res.redirect('/soon');
});*/

app.get('/',
    function (req, res) {
    if (process.env.NODE_ENV == 'production') {
        res.redirect('/soon');
        return;
    }
    var isLive = (req.signedCookies.sultagitlive == 'live');
    switch (process.env.NODE_ENV) {
        case 'production':
            title = 'sultag.it';
            break;
        case 'development':
            title = 'sultag.it - dev';
            break;
         default:
             title = 'sultag.it - local';
             break;
    }
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

// handle subscription handshake
app.get('/subscriptions', function (req, res) {
    sultagitLive.subscriptionHandshake(req, res);
});

// get updated data
app.post('/subscriptions', function (req, res) {
    res.send(200);
    sultagitLive.update(req.body);
});

// unsubscribeAll backdoor
app.get('/unsub', basicAuth, function(req, res) {
    sultagitLive.unsubscribeAll();
    res.send(200);
});

app.get('/soon', function (req, res) {
    var ua = req.headers['user-agent'];
    var title = 'sultag.it - ';
    switch (process.env.NODE_ENV) {
        case 'production':
            title = 'sultag.it';
            break;
        case 'development':
            title = 'sultag.it - dev';
            break;
         default:
             title = 'sultag.it - local';
             break;
    }
    if (ua.indexOf('Android') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) {
        res.render('soon', {open: "[%", close: "%]", title: title, is_mobile: true});
    }
    else {
        res.render('soon', {open: "[%", close: "%]", title: title, is_mobile: false});
    }
});

if (process.env.NODE_ENV !== 'production') {
    // development backdoors
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

app.use(express.static(path.join(__dirname, 'public')));

server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));

    //when app starts unsubscribe from all exisiting instagram subscriptions
    sultagitLive.unsubscribeAll();
});