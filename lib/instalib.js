var Instagram = require('instagram-node-lib')
    , RateLimit = require('../lib/rateLimit.js');


if (process.env.NODE_ENV) {
    //instagram client - remote
    var client_id = 'ab9c4ad6b1ca4a7b9b0b037494004307';
    var client_secret = '38ab89bec6864c0ca45d716e2943c8da';
    var callback_url = 'http://sultag.it/subscriptions';
}
else {
    //instagram client - local
    
    var client_id = '83b37f581755407a9536df3aab8b9366';
    var client_secret = '79385db4ea4241c1a23a7d4dd94eeb10';
    var callback_url = 'http://seminargram.jit.su/subscriptions';
}


var resolution = "low_resolution" // [thumbnail|low_resolution|standard_resolution]

// handle Instagram's request rate limitation (5000 requests per hour)

var maxRequestPer = 5000;
var igRequestInterval = (60 * 1.01) * 60 * 1000 // mins (+1% to be safe) * secs * ms
var igRequestsDispatcher = new RateLimit(maxRequestPer, igRequestInterval, false);

//a working example of how to use the wrapper and the scehdualing
/*
var igRequestsDispatcher = new RateLimit(2, 2000, false);

st = Date.now();
function logger (i) {
    // console.log("@logger msg:", i);
    if (i == maxRequestPer) {
        console.log("@logger done. i=%d elapsed: %d", i, (Date.now() - st));
    }
}
for (var i = 1; i <= maxRequestPer; i++) {
    console.log("scheding");
    igRequestsDispatcher.schedule(logger, logger, i);
};
*/
// Configure Instagram credentials
Instagram.set('client_id', client_id);
Instagram.set('client_secret', client_secret);
Instagram.set('callback_url', callback_url);

module.exports = {
    getTagMediaCount: function (tagName, callback) {
        var optionsObject = {
            name: tagName,
            error: function (errorMessage, errorObject, caller) {
                console.log("@instalib.getTagMediaCount - getting count for tag '%s' returned an error", tagName, errorMessage, errorObject);
                callback(errorMessage);
            },
            complete: function (data) {
                // console.log("@instalib.getTagMediaCount - count is %d", data.media_count);
                callback(null, data.media_count);
            }
        }
        igRequestsDispatcher.schedule(Instagram.tags.info, Instagram.tags, optionsObject);
    },
    getRecentImagesUrl: function (tagName, min_tag_id, callback) {
        var optionsObject = {
            name: tagName,
            error: function (errorMessage, errorObject, caller) {
                console.log("@instalib.getRecentImagesUrl - getting recent for tag '%s' returned an error", tagName, errorMessage, errorObject);
                callback(errorMessage);
            },
            complete: function (data, pagination) {
                var min_tag_id = null;
                var imagesUrl = [];
                for (var i = 0; i < data.length; i++) {
                    if (data[i].images[resolution].url) {
                        imagesUrl[i] = data[i].images[resolution].url;
                    }
                    else {
                        imagesUrl[i] = data[i].images[resolution]
                    }
                };
                if (pagination && pagination.min_tag_id) {
                    min_tag_id = pagination.min_tag_id;
                }
                callback(null, imagesUrl, min_tag_id);
            }
        };
        if (min_tag_id) {
            // console.log("@instalib.getRecentImagesUrl - min_tag_id", min_tag_id);
            optionsObject.min_tag_id = min_tag_id;
        }
        igRequestsDispatcher.schedule(Instagram.tags.recent, Instagram.tags, optionsObject);
    },
    subscribeTag: function (tagName, callback) {
        var token = "token_" + tagName;
        var optionsObject = {
            object_id: tagName,
            verify_token: token,
            error: function (errorMessage, errorObject, caller) {
                console.log ("@instalib.subscribeTag - subscribing tag '%s' returned an error", tagName, errorMessage, errorObject);
                callback(errorMessage);
            },
            complete: function (subscription) {
                // subscribedTag = subscription.object_id;
                subscriptionId = subscription.id;
                callback(null, subscriptionId);
            }    
        }
        igRequestsDispatcher.schedule(Instagram.tags.subscribe, Instagram.tags, optionsObject);
    },
    unsubscribeAll: function (callback) {
        console.log("@instalib.unsubscribeAll");
        var optionsObject = {
            dummy: "",
            error: function (errorMessage, errorObject, caller) {
                console.log("@instalib.unsubscribeAll - error:", errorMessage, errorObject);
                callback(errorObject);
            },
            complete: function (data) {
                callback(data);
            }
        }
        Instagram.subscriptions.unsubscribe_all(optionsObject);
    },
    handshake: function (req, res, callback) {
        Instagram.subscriptions.handshake(req, res, function (verifyToken) {
            // console.log("@instalib.handshake - verify token is:", verifyToken);
            callback(verifyToken);
        });
    }
}
