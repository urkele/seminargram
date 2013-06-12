
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
app.get('/subscriptions', gramroutes.handshakeSubscription);
app.post('/subscriptions', gramroutes.gotSubscription);
app.post('/fakesubscriptions', gramroutes.gotSubscription);
app.get('/poster', gramroutes.getPoster);
app.get('/gettags',gramroutes.gettags);
app.get('/getTagsDummy',function (req,res) {
    var jsn = {
        picture: {
            images:[
                'http://distilleryimage9.s3.amazonaws.com/38716c88ccba11e2bb6122000a1f9d92_6.jpg',
                'http://distilleryimage1.s3.amazonaws.com/69ec575ed37311e2864822000a9f09cf_6.jpg',
                'http://distilleryimage11.s3.amazonaws.com/a28db1e6cede11e2988322000a1ddbb4_6.jpg',
                'http://distilleryimage10.s3.amazonaws.com/92c1cbd2d37311e2842e22000a1fb2cc_6.jpg',
                'http://distilleryimage1.s3.amazonaws.com/bd5c5cc0d36111e2b65722000a9e00be_6.jpg',
                'http://distilleryimage9.s3.amazonaws.com/09256888d37411e2a2ce22000a1fa411_6.jpg',
                'http://distilleryimage1.s3.amazonaws.com/52925e7ed37211e2b3d922000a9f309f_6.jpg',
                'http://distilleryimage11.s3.amazonaws.com/fe1ca258d37311e2938522000aaa21ef_6.jpg',
                'http://distilleryimage6.s3.amazonaws.com/b926a720d37311e2a46122000a9f09e2_6.jpg',
                'http://distilleryimage9.s3.amazonaws.com/9aaa451cd36a11e2996322000a9f1313_6.jpg',
                'http://distilleryimage10.s3.amazonaws.com/f6da26ce582511e2a68f22000a9f0a3c_6.jpg',
                'http://distilleryimage9.s3.amazonaws.com/1ecb3eb4cf3311e2b10722000a1f98d4_6.jpg',
                'http://distilleryimage0.s3.amazonaws.com/3aff6112d37211e2b82c22000a1fbca3_6.jpg',
                'http://distilleryimage6.s3.amazonaws.com/fd32410ed37311e2a8e322000a9f13d9_6.jpg',
                'http://distilleryimage10.s3.amazonaws.com/eefafb78d33011e2898122000a9e069f_6.jpg',
                'http://distilleryimage5.s3.amazonaws.com/eba5f2decd4f11e2890c22000a1fa80f_6.jpg',
                'http://distilleryimage9.s3.amazonaws.com/8f464a00d37311e287db22000aa803d4_6.jpg',
                'http://distilleryimage2.s3.amazonaws.com/ecb4dd32d37311e2933922000a1fc684_6.jpg'
            ]
        },
        your: {
            images:[
                'http://distilleryimage2.s3.amazonaws.com/fdc1bffad37311e2bb4e22000aaa0771_6.jpg',
                'http://distilleryimage0.s3.amazonaws.com/d6ab4850d37311e2890c22000a1fa80f_6.jpg',
                'http://distilleryimage5.s3.amazonaws.com/d72459b6d37311e2bd9a22000a9f14ba_6.jpg',
                'http://distilleryimage11.s3.amazonaws.com/96c84130d37211e2bc2222000a1f98f9_6.jpg',
                'http://distilleryimage11.s3.amazonaws.com/e620ce72d37311e287f422000a1f9afa_6.jpg',
                'http://distilleryimage6.s3.amazonaws.com/c17b25ead37311e2940222000a1fbd52_6.jpg',
                'http://distilleryimage1.s3.amazonaws.com/d0cc4e84d37311e2bee422000a9f14ea_6.jpg',
                'http://distilleryimage3.s3.amazonaws.com/b0cd223ed37311e2bec722000a1f8c33_6.jpg',
                'http://distilleryimage0.s3.amazonaws.com/e8def7bad37311e2931a22000aaa0ff5_6.jpg',
                'http://distilleryimage2.s3.amazonaws.com/b405273ad37311e2b19622000a1f9d89_6.jpg',
                'http://distilleryimage11.s3.amazonaws.com/6dafea22d37311e28eb922000a1fbc88_6.jpg',
                'http://distilleryimage1.s3.amazonaws.com/afd21876d37311e2ab6822000a1fb191_6.jpg',
                'http://distilleryimage9.s3.amazonaws.com/e0d49ff2d37311e2bd6022000aa80383_6.jpg',
                'http://distilleryimage5.s3.amazonaws.com/60f5ca0a568b11e2971f22000a1f8c25_6.jpg',
                'http://distilleryimage10.s3.amazonaws.com/3c642ed8d37311e2b26122000a1fb538_6.jpg',
                'http://distilleryimage5.s3.amazonaws.com/02d7b20cd37311e2a9a222000aa81a0e_6.jpg',
                'http://distilleryimage8.s3.amazonaws.com/cf16f6acd37311e2900122000a1f932b_6.jpg',
                'http://distilleryimage10.s3.amazonaws.com/671ae3ead37011e28c6122000aa8013a_6.jpg'
                ]
        },
        words: {
            images:[
                'http://distilleryimage9.s3.amazonaws.com/b58cb348d37311e2895222000aaa0568_6.jpg',
                'http://distilleryimage2.s3.amazonaws.com/e62d04ccd37211e2bee422000a9f14ea_6.jpg',
                'http://distilleryimage8.s3.amazonaws.com/04ac5f5ad37411e2a97a22000a9f18aa_6.jpg',
                'http://distilleryimage1.s3.amazonaws.com/b9518db4d37311e293e222000a1fc7f0_6.jpg',
                'http://distilleryimage1.s3.amazonaws.com/ec57063ad37311e2992f22000a1fb823_6.jpg',
                'http://distilleryimage6.s3.amazonaws.com/e497e1b2d37311e2aea022000a9d0ee7_6.jpg',
                'http://distilleryimage0.s3.amazonaws.com/e8def7bad37311e2931a22000aaa0ff5_6.jpg',
                'http://distilleryimage10.s3.amazonaws.com/b2d7dd12d37311e2bba622000a1fbc9c_6.jpg',
                'http://distilleryimage2.s3.amazonaws.com/0f04ec8c01e311e28df322000a1e9df2_6.jpg',
                'http://distilleryimage7.s3.amazonaws.com/a8404ddad37311e2a72522000a1fb586_6.jpg',
                'http://distilleryimage2.s3.amazonaws.com/e4734848d37311e2b62722000a1fbc10_6.jpg',
                'http://distilleryimage5.s3.amazonaws.com/c1b2e30ed37311e2bc2222000a1f98f9_6.jpg',
                'http://distilleryimage0.s3.amazonaws.com/bee95ec4d37211e2a91a22000a9e089b_6.jpg',
                'http://distilleryimage8.s3.amazonaws.com/c601b17ed37311e2962a22000a1f930e_6.jpg',
                'http://distilleryimage6.s3.amazonaws.com/6e5b077cd37311e288bf22000a9f13cb_6.jpg',
                'http://distilleryimage5.s3.amazonaws.com/c7f1fee4d37311e2bab822000a9f3c25_6.jpg',
                'http://distilleryimage7.s3.amazonaws.com/b5283166d37311e2b4d922000a1fae83_6.jpg',
                'http://distilleryimage7.s3.amazonaws.com/4be712e4d37311e2926822000a1f9c9b_6.jpg',
                'http://distilleryimage5.s3.amazonaws.com/1a759c7cd36311e287a322000ae81e57_6.jpg'
                ]
        }
    }
    res.send(jsn);
})


server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
    //when app starts unsubscribe from all exisiting instagram subscriptions
    gramroutes.unsubscribeAll();
});
gramroutes.createSocket(server);