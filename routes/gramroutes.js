var async = require('async')
    , instalib = require('../lib/instalib.js')
    , colorlib = require('../lib/colorlib.js')
    , dblib = require('../lib/dblib.js');

//an array that hold all of the currently subscribed tags and their up to date info
var tags = {};

function Tag(tagName) {
    //TODO: maybe set up setters and getters
    this.tagName = tagName;
    this.images = new Array();
    this.data = {}
    this.data.tagDominantColor = null;
    this.data.tagMediaCount = null;
};

module.exports = {
    //create socket session
    createSocket: function (server) {
        io = require('socket.io').listen(server);
        io.set('log level', 1); // set socket.io logging level to 'warn'
        io.sockets.on('connection', function (socket) {
            socket.emit('connection', 'connected');
            socket.on('init', function (requestedTagsDirty) {
                console.log("@gramroutes.createSocket - got init form client:", requestedTagsDirty);
                if (requestedTagsDirty && requestedTagsDirty.length !== 0) {
                    //TODO: also clean duplicate tags and clean non alpha numeric letters
                    for (var badIndex = requestedTagsDirty.indexOf(""); badIndex > -1; badIndex = requestedTagsDirty.indexOf("")) {
                        requestedTagsDirty.splice(badIndex, 1);
                    }
                    var requestedTags = requestedTagsDirty;
                };
                if (requestedTags && requestedTags.length !== 0) {
                    getInitialData(requestedTags, function(err, data) {
                        if (err) {
                            console.log("@gramroutes.createSocket - error getting initial data:", err);
                        }
                        else {
                            console.log("@gramroutes.createSocket - got initial data:", data);
                            socket.emit('newData', data);
                        };
                    })
                }
                else {
                    console.log("@gramroutes.createSocket - no tags requested")
                }
            });
            socket.on('subscriptions', function (data) {
                console.log("@gramroutes.createSocket - got 'subscriptions' form client", data);
                if (data.handle) {
                    if (data.handle == "stop") {
                        unsubscribeAll();
                    }
                }
            })
        });
    },
    getIndex : function(req, res){
        res.render('index', { title: 'sultag.it' });
    },
    handshakeSubscription: function(req,res){
        console.log("@gramroutes.handshakeSubscription");
        instalib.handshake(req,res,function(data){
            console.log("@gramroutes.handshakeSubscription - verify token is:", data);
        });
    },
    gotSubscription: function (req, res) {
        res.send(200);
        console.log("@gramroutes.gotSubscription - req.body:", req.body);
        var updatedData = req.body.data;
        // console.log("@gramroutes.gotSubscription - updatedData:", updatedData);
        var updatedTags = new Array();
        for (var i = 0; i < updatedData.length; i++) {
            updatedTags[i] = updatedData[i].object_id;
        };
        console.log("@gramroutes.gotSubscription - updatedTags:", updatedTags);
        async.map(updatedTags, getTagUpdatedData, function (err, results) {
            if (err) {
                console.log ("@gramroutes.gotSubscription.map err:", err);
                // emit an (err);
            }
            else {
                console.log ("@gramroutes.gotSubscription.map results:", results);
                // emit (results);
            };
        })
    },
    getPoster: function (req, res) {
        res.render('poster', {title: 'Seminargram'});
    },
    gettags: function (req, res) {
        res.send(tags);
    }
};

var unsubscribeAll = function () {
    console.log ("@gramroutes.unsubscribeAll");
    instalib.unsubscribeAll (function (data) {
        if (data != null) {
            console.log ("@gramroutes.unsubscribeAll - error:", data)
        }
    });
}

//expose unsubscribeAll
module.exports.unsubscribeAll = unsubscribeAll;

var handleImageDominantColor = function (imageUrl, callback) { // get image's dominant color and write it to the DB
    colorlib.getImageDominantColor (imageUrl, function (err, imageDominantColor) {
        if (err) {
            console.log ("@gramroutes.handleImageDominantColor.getImageDominantColor err", err);
            callback(err);
        }
        else {
            //write imageDominantColor to DB
            dblib.writeColor (imageDominantColor, function (err) {
                if (err) {
                    console.log ("@gramroutes.handleImageDominantColor.writeColor err", err);
                    callback(err);
                }
                else {
                    // console.log ("@gramroutes.handleImageDominantColor.writeColor success");
                    callback(null);
                };
            });
        };
    });
}

var getTagData = function (tagName, callback) {
    //TODO: handle API errors - APINotAllowedError
    async.parallel ({
        getTagMediaCount: function (parallelCallback) {
            instalib.getTagMediaCount(tagName, parallelCallback)
        },
        getTagUrlsandColor: function (parallelCallback) {
            async.series ({
                getImagesUrlandColors: function (seriesCallback) {
                    instalib.getRecentImagesUrl(tagName, function (err, imagesUrl) {
                        if (err) {
                            console.log("@gramroutes.getImagesUrlandColors err", err);
                            seriesCallback(err);
                        }
                        else {
                            async.each(imagesUrl, handleImageDominantColor, function (err) {
                                if (err) {
                                    console.log("@gramroutes.getImagesUrlandColors.each err", err);
                                    seriesCallback(err);
                                };
                            });
                            // console.log("@gramroutes.getImagesUrlandColors imagesUrl = success");
                            seriesCallback(null, imagesUrl);
                        };
                    });
                },
                getTagDominantColor: function (seriesCallback) {
                    colorlib.getTagDominantColor(tagName, seriesCallback);
                }
            },
            function (err, results) { // this is the 'seriesCallback' which is called after all function are complete.
                if (err) {
                    console.log ("@gramroutes.getImagesInfo.series err:", err);
                    parallelCallback (err);
                }
                else {
                    parallelCallback (null, results);
                };
            })
        }
    },
    function (err, results) { // this is the 'parallelCallback' which is called after all function are complete.
        if (err) {
            console.log ("@gramroutes.getTagData.parallel err:", err);
            callback (err);
        }
        else {
            // console.log ("@gramroutes.getTagData.parallel results:", results);
            callback (null, results);
        };
    })
}

var getTagUpdatedData = function (tagName, callback) {
    if (!tags[tagName]) {
        var err = "cannot match tag '" + tagName + "'' to list of existing tags";
        console.log ("@gramroutes.getTagUpdatedData err:", err);
        callback (err);
    }
    else {
        var tag = tags[tagName];
        getTagData(tagName, function (err, results) {
            if (err) {
                console.log ("@gramroutes.getTagUpdatedData.getTagData err:", err)
            }
            else {
                // console.log ("@gramroutes.getTagUpdatedData.getTagData results:", results);
                // set the Tag's properties
                tag.images = results.getTagUrlsandColor.getImagesUrlandColors;
                tag.data.tagDominantColor = results.getTagUrlsandColor.getTagDominantColor;
                tag.data.tagMediaCount = results.getTagMediaCount;
                callback(null, tag);
            }
        })
    }

}

var getTagInitialData = function (tagName, callback) {
    if (tags[tagName]) {
        var tag = tags[tagName];
    }
    else {
        var tag = new Tag (tagName);
        tags[tagName] = tag;
    }
    async.parallel ({
        getTagData: function (parallelCallback) {
            getTagData(tagName, parallelCallback);
        },
        subscribeTag: function (parallelCallback) {
            if (typeof tag.subscriptionId === 'undefined' || tag.subscriptionId == null || tag.subscriptionId == "") {
                instalib.subscribeTag (tagName, function (err, subscriptionId) {
                    if (err) {
                        console.log ("@gramroutes.getTagInitialData.subscribeTag err:", err);
                        parallelCallback (err);
                    }
                    else {
                        parallelCallback (null, subscriptionId);
                    };
                });
            }
            else {
                console.log ("@gramroutes.getTagInitialData.subscribeTag - already subscribed to tag:", tagName);
                parallelCallback(null, tag.subscriptionId); //take care not to overwrite the subscription ID afterwards.
            };
        }
    },
    function (err, results) {
        if (err) {
            console.log ("@gramroutes.getTagInitialData.parallel err:", err);
            callback (err);
        }
        else {
            //set the Tag's properties
            tag.images = results.getTagData.getTagUrlsandColor.getImagesUrlandColors;
            tag.data.tagDominantColor = results.getTagData.getTagUrlsandColor.getTagDominantColor;
            tag.data.tagMediaCount = results.getTagData.getTagMediaCount;
            tag.subscriptionId = results.subscribeTag;
            callback(null, tag);
        };
    })
}

var getInitialData = function (requestedTags, callback) {
    async.map (requestedTags, getTagInitialData, function (err, results) {
        if (err) {
            console.log ("@gramroutes.getInitialData.map err:", err);
            callback (err);
        }
        else {
            callback (null, results);
        };
    })
}