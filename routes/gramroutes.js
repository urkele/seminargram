var async = require('async')
    , instalib = require('../lib/instalib.js')
    , colorlib = require('../lib/colorlib.js')
    , dblib = require('../lib/dblib.js');

//an array that hold all of the currently subscribed tags and their up to date info
var tags = {};

function Tag(tagName) {
    this.data = {};    
    this.data.tagName = tagName;
    this.data.images = new Array();
    this.data.dominantColor = null;
    this.data.mediaCount = null;

    this.subscription = {};
    this.subscription.subscriptionId = null;
    this.subscription.registeredClients = new Array();

    //define setters
    /*this.setImages = function (images) {
        info.images = images;
    };
    this.setDominantColor = function (color) {
        info.data.dominantColor = color;
    };
    this.setMediaCount = function (num) {
        info.data.mediaCount = num;
    };
    this.setSubscriptionId = function (id) {
        subscription.instagramSubscriptionId = id;
    };*/
    this.registerClient = function (clientId) {
        this.subscription.registeredClients.push(clientId);
    };

    //define getters
    /*this.getTegisteredClients = function () {
        return subscription.registeredClients;
    };
    this.getSubscriptionId =function () {
        return subscription.instagramSubscriptionId;
    };
    this.getInfo = function () {
        return this.info;
    };*/

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
                    getInitialData(requestedTags, socket.id, function(err, data) {
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
            });
        });
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
        async.each(updatedTags,
            function (tagName, outerEachCallback) {
                getTagUpdatedData(tagName, function (err, tag) {
                    if (err) {
                        outerEachCallback(err);
                    }
                    else {
                        var clients = tag.subscription.registeredClients;
                        var data = tag.data;
                        async.each(clients,
                            function (clientId, innerEachCallback) {
                                io.sockets.socket(clientId).emit('newData', data);
                                innerEachCallback();
                            },
                            function (err) {
                                if (err) {
                                    outerEachCallback(err);
                                }
                                else {
                                    outerEachCallback();
                                }
                            });
                    };
                });
            },
            function (err) {
            if (err) {
                console.log ("@gramroutes.gotSubscription.each err:", err);
                // emit an (err);
            }
            else {
                //?
            };
        })
    },
    getIndex : function(req, res){
        res.render('index', { title: 'sultag.it' });
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
                tag.data.images = results.getTagUrlsandColor.getImagesUrlandColors;
                tag.data.dominantColor = results.getTagUrlsandColor.getTagDominantColor;
                tag.data.mediaCount = results.getTagMediaCount;
                callback(null, tag);
            }
        })
    }

}

var getTagInitialData = function (tagName, clientId, callback) {
    if (tags[tagName]) {
        var tag = tags[tagName];
        tag.registerClient(clientId);
    }
    else {
        var tag = new Tag (tagName);
        tag.registerClient(clientId);
        tags[tagName] = tag;
    }
    async.parallel ({
        getTagData: function (parallelCallback) {
            getTagData(tagName, parallelCallback);
        },
        subscribeTag: function (parallelCallback) {
            var id = tag.subscription.subscriptionId;
            if (typeof id === 'undefined' || id == null || id == "") {
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
                parallelCallback(null, id); //take care not to overwrite the subscription ID afterwards.
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
            tag.data.images = results.getTagData.getTagUrlsandColor.getImagesUrlandColors;
            tag.data.dominantColor = results.getTagData.getTagUrlsandColor.getTagDominantColor;
            tag.data.mediaCount = results.getTagData.getTagMediaCount;
            tag.subscription.subscriptionId = results.subscribeTag;
            callback(null, tag.data);
        };
    })
}

var getInitialData = function (requestedTags, clientId, callback) {
    async.map (requestedTags,
        function(tagName, mapCallback) {
            getTagInitialData (tagName, clientId, function (err, results) {
                if (err) {
                    mapCallback(err);
                }
                else {
                    mapCallback(null, results);
                }
            })
        },
        function (err, results) {
            if (err) {
                console.log ("@gramroutes.getInitialData.map err:", err);
                callback (err);
            }
            else {
                callback (null, results);
            };
        })
}