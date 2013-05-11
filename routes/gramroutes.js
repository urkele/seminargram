var async = require('async')
    , instalib = require('../lib/instalib.js')
    , colorlib = require('../lib/colorlib.js')
    , dblib = require('../lib/dblib.js');

var initialDataSent = false;
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
    gotSubscription: function(req,res){
        res.send(200);
        console.log("@gramroutes.gotSubscription",req.body);
        var updatedTags = req.body;
        if (!initialDataSent){
            console.log("@gramroutes.gotSubscription - initial data wasn't sent yet")
            //TODO: exit
        }
        var tagsInfo = [];
        async.each( //do work on each subscription that was updated
            updatedTags,
            function(updatedTag,eachCallback){ // the async.each iterator
                var tagName = updatedTag.object_id;
                var updateTime = updatedTag.time;
                var subscriptionId = updatedTag.subscription_id;
                console.log("@gramroutes.gotSubscription - for:", tagName);
                if(tags[tagName] && tags[tagName].subscriptionId == subscriptionId){
                    tag = tags[tagName];
                }
                else {
                    console.log("@gramroutes.gotSubscription - That's weird. \"%s\" with subscription ID:%d is not listed the tags list",tagName,subscriptionId);
                    // eachCallback("subscription update for unlisted tag");
                    //TODO: stop operation;
                }
                tagsInfo.push(tag);
                async.parallel({ // the async.parallel functions object. Contains the function to be called.
                    getTagMediaCount: function(parallelCallback){
                        console.log("@gramroutes.gotSubscription.getTagMediaCount - for: %s",tagName);
                        instalib.getTagMediaCount(tagName,function(mediaCount){
                            console.log("@gramroutes.gotSubscription.getTagMediaCount - for: %s is %d",tagName,mediaCount);
                            tag.data.tagMediaCount = mediaCount;
                            console.log("@gramroutes.gotSubscription.getTagMediaCount - but tagMediaCount is:",tag.data.tagMediaCount);
                            parallelCallback();
                        });
                    },
                    getImageInfo: function(parallelCallback){
                        //get data about image
                        console.log("@gramroutes.gotSubscription.getImageInfo - for:", tagName);
                        async.series({ // the async.series functions object. Contains the functions to be called.
                            getImageUrl: function(seriesCallback){
                                console.log("@gramroutes.gotSubscription.getImageUrl - for:", tagName);
                                instalib.getRecentImageUrl(tagName,function(imageUrl){ //relate to time? or max_id?
                                    tag.recentImage.imageUrl = imageUrl;
                                    seriesCallback();
                                });
                            },
                            getImageDominantColor: function(seriesCallback){
                                console.log("@gramroutes.gotSubscription.getImageDominantColor - for:", tagName);
                                colorlib.getImageDominantColor(tag.recentImage.imageUrl,function(imageDominantColor){
                                    tag.recentImage.imageDominantColor = imageDominantColor;
                                    seriesCallback();
                                });
                            },
                            getTagDominantColor: function(seriesCallback){
                                console.log("@gramroutes.gotSubscription.getTagDominantColor - for:", tagName);
                                colorlib.getTagDominantColor(tagName,function(tagDominantColor){
                                    tag.data.tagDominantColor = tagDominantColor;
                                    seriesCallback();
                                });
                            }
                        }, //--end async.series functions object
                        function(err, results){ // this is the 'seriesCallback' which is called after all function are complete.
                            // results is an object of the results from each of the functions.
                            if(err){
                                console.log("@gramroutes.gotSubscription.seriesCallback.err - error:",err);
                            };
                            parallelCallback();
                        }) //--end async.series
                    },
                }, //--end async.parallel functions object
                    function(err, results){ // this is the 'parallelCallback' which is called after all function are complete.
                        // results is an object of the results from each of the functions.
                        if(err){
                            console.log("@gramroutes.gotSubscription.parallelCallback.err - error:",err);
                        };
                        eachCallback();
                }) //--end async.parallel
            }, //--end async.each iterator
            function(err){ //this is the 'eachCallback' which is called after all of the array members were processed
                if(err){
                    console.log("@gramroutes.gotSubscription.eachCallback.err - error:",err);
                };
                console.log("@gramroutes.gotSubscription - sending tagsInfo:", tagsInfo)
                // res.send(tagsInfo); 
                // console.log("@gramroutes.getInitialData - the tags array is:", tags)
            }) //--end async.each
    },
    getPoster : function(req, res){
        res.render('poster', { title: 'Seminargram' });
    },
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
                    console.log ("@gramroutes.handleImageDominantColor.writeColor success");
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
                            console.log("@gramroutes.getImagesUrlandColors imagesUrl = success");
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
            callback (null, results);
        };
    })
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
            callback(null, tag); //should return a transformed array item - ie a Tag object with its data.
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
            initialDataSent = true;
        };
    })
}