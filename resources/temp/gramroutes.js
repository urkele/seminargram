var async = require('async')
    , instalib = require('../lib/instalib.js')
    , colorlib = require('../lib/colorlib.js')
    , dblib = require('../lib/dblib.js');

//an array that hold all of the currently subscribed tags and their up to date info
var tags = {};

// gloval variable to hold instagram errors that should be handled
var InstagramError_APINotAllowed = "APINotAllowedError"

function Tag(tagName) {
    this.data = {};    
    this.data.tagName = tagName;
    this.data.images = new Array();
    this.data.dominantColor = null;
    this.data.mediaCount = null;

    this.subscription = {};
    this.subscription.subscriptionId = null;
    this.subscription.registeredClients = new Array();
    this.pagination = {};
    this.pagination.min_tag_id = null; //to get only the most recent data

    //define setters
    this.registerClient = function (clientId) {
        this.subscription.registeredClients.push(clientId);
    };

};

module.exports = {
    //create socket session
    createSocket: function (server) {
        io = require('socket.io').listen(server);
        io.configure(function () {
            io.set('flash policy server', false);
            io.set('log level', 1); // set socket.io logging level to 'warn'
        })
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
                            // console.log("@gramroutes.createSocket - got initial data:", data);
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
                        unsubscribeAll(function (data) {
                            socket.emit('debug', {"unsubscribed": data});
                        });
                    }
                    else if (data.handle == "unsubscribe") {
                        unregisterTags(data.tags, socket.id, function (err) {
                            if (err) {
                                console.log("@gramroutes.createSocket - error unsubscribing tags:", err);
                            }
                            else {
                                socket.emit('debug', {"unsubscribedTags": data.tags});
                            }
                        });
                    }
                }
            });
        });
    },
    handshakeSubscription: function(req,res){
        console.log("@gramroutes.handshakeSubscription");
        instalib.handshake(req,res,function(data){
            // console.log("@gramroutes.handshakeSubscription - verify token is:", data);
        });
    },
    gotSubscription: function (req, res) {
        res.send(200);
        // console.log("@gramroutes.gotSubscription - req.body:", req.body);
        if (process.env.NODE_ENV) {
            var updatedData = req.body; //real production data
        }
        else {
            var updatedData = req.body.data; //localhost simulator
        }
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
                        // console.log("@gramroutes.gotSubscription - sending data:", data);

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
        if (process.env.NODE_ENV) {
            res.render('index', { title: 'sultag.it', open: "{{", close: "}}" });
        }
        else {
            res.render('index', { title: 'sultag.it - local', open: "{{", close: "}}" });
        }
    },
    getPoster: function (req, res) {
        res.render('poster', {title: 'Seminargram'});
    },
    gettags: function (req, res) {
        res.send(tags);
    }
};

var unsubscribeAll = function (callback) {
    console.log ("@gramroutes.unsubscribeAll");
    instalib.unsubscribeAll (function (data) {
        if (data != null) {
            console.log ("@gramroutes.unsubscribeAll - error:", data);
        };
        if (typeof callback == "function") {
            callback(data)
        };
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
            instalib.getTagMediaCount(tagName, function (err, tagMediaCount) {
                if (err) {
                    console.log("@gramroutes.getTagMediaCount err", err);
                    if (err == InstagramError_APINotAllowed) {
                        parallelCallback(null, InstagramError_APINotAllowed);
                    }
                    else {
                        parallelCallback(err);
                    };
                }
                else {
                    parallelCallback(null, tagMediaCount)
                }
            })
        },
        getTagUrlsandColor: function (parallelCallback) {
            async.series ({
                getImagesUrlandColors: function (seriesCallback) {
                    var min_tag_id = tags[tagName].pagination.min_tag_id;
                    instalib.getRecentImagesUrl(tagName, min_tag_id, function (err, imagesUrl, min_tag_id) {
                        if (err) {
                            console.log("@gramroutes.getImagesUrlandColors err", err);
                            if (err == InstagramError_APINotAllowed) {
                                seriesCallback(null, InstagramError_APINotAllowed);
                            }
                            else {
                                seriesCallback(err);
                            };
                        }
                        else {
                            async.each(imagesUrl, handleImageDominantColor, function (err) {
                                if (err) {
                                    console.log("@gramroutes.getImagesUrlandColors.each err", err);
                                    seriesCallback(err);
                                };
                            });
                            tags[tagName].pagination.min_tag_id = min_tag_id;
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
            console.log ("@gramroutes.getTagData.parallel results:", results);
            callback (null, results);
        };
    })
}

var getTagUpdatedData = function (tagName, callback) {
    if (!tags[tagName]) {
        var err = "cannot match tag '" + tagName + "' to list of existing tags";
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

var unregisterTags = function (tagNames, clientId, callback) {
    console.log("@gramroutes.unregisterTags - for client '%s'", clientId, tagNames);
    async.each(tagNames,
        function (tagName, eachCallback) {
            var error = "";
            if (!tags[tagName]) {
                eachCallback("tag not registered")
            }
            else {
                //unregister this client from the tag
                var registeredClients = tags[tagName].subscription.registeredClients;
                registeredClients.splice(registeredClients.indexOf(clientId), 1);
                // cleanup tag if no clients are registered
                if (registeredClients.length == 0) {
                    console.log("@gramroutes.unregisterTags - no more clients registered for tag", tagName);
                    // unsubscribe
                    var subscriptionId = tags[tagName].subscription.subscriptionId;
                    if (subscriptionId) {
                        instalib.unsubscribeTag(subscriptionId, function (err, data) {
                            if (err) {
                                error += "error unsubscribing "+subscriptionId+": "+err;
                            }
                        });
                    }
                    else {
                        error += "no subscription Id for tag "+tagName;
                    };
                    //remove tag from tags list
                    if (!delete tags[tagName]) {
                        error += "| error removing '"+tagName+"' from tags array";
                    };
                    if (error !== "") {
                        eachCallback(error);
                    }
                    else {
                        eachCallback(null);
                    };
                }
                else {
                    eachCallback(null);
                }
            }
        },
        function (err) {
            if (err) {
                if (err == "tag not registered"){
                    callback(null);
                }
                console.log("@gramroutes.unregisterTags - error unsubscribing from tag:", err);
                callback(err);
            }
            else {
                callback(null);
            }
        })
}