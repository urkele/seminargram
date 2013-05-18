var Instagram = require('instagram-node-lib');

//client1 local
var client_id = '83b37f581755407a9536df3aab8b9366';
var client_secret = '79385db4ea4241c1a23a7d4dd94eeb10';
var callback_url = 'http://seminargram.jit.su/subscriptions';
//client2 prod
/*
var client_id = 'ab9c4ad6b1ca4a7b9b0b037494004307';
var client_secret = '38ab89bec6864c0ca45d716e2943c8da';
var callback_url = 'http://sultag.it/subscriptions';
*/

var resolution = "low_resolution" // [thumbnail|low_resolution|standard_resolution]

// Configure Instagram credentials
Instagram.set('client_id', client_id);
Instagram.set('client_secret', client_secret);
Instagram.set('callback_url', callback_url);

module.exports = {
    getTagMediaCount: function (tagName, callback) {
        Instagram.tags.info({
            name: tagName,
            error: function (errorMessage, errorObject, caller) {
                console.log("@instalib.getTagMediaCount - getting count for tag '%s' returned an error", tagName, errorMessage, errorObject);
                callback(errorMessage);
            },
            complete: function (data) {
                console.log("@instalib.getTagMediaCount - count is %d", data.media_count);
                callback(null, data.media_count);
            }
        });
    },
    getRecentImagesUrl: function (tagName, callback) {
        Instagram.tags.recent({
            name: tagName,
            error: function (errorMessage, errorObject, caller) {
                console.log("@instalib.getRecentImagesUrl - getting recent for tag '%s' returned an error", tagName, errorMessage, errorObject);
                callback(errorMessage);
            },
            complete: function (data) {
                var imagesUrl = [];
                for (var i = 0; i < data.length; i++) {
                    if (data[i].images[resolution].url) {
                        imagesUrl[i] = data[i].images[resolution].url;
                    }
                    else {
                        imagesUrl[i] = data[i].images[resolution]
                    }
                };
                callback(null, imagesUrl);
            }
        })
    },
    subscribeTag: function (tagName, callback) {
        var token = "token_" + tagName;
        Instagram.tags.subscribe ({
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
        });
    },
    unsubscribeAll: function (callback) {
        console.log("@instalib.unsubscribeAll");
        Instagram.subscriptions.unsubscribe_all({
            dummy: "",
            error: function (errorMessage, errorObject, caller) {
                console.log("@instalib.unsubscribeAll - error:", errorMessage, errorObject);
                callback(errorObject);
            },
            complete: function (data) {
                callback(data);
            }
        });
    },
    handshake: function (req, res, callback) {
        Instagram.subscriptions.handshake(req, res, function (verifyToken) {
            console.log("@instalib.handshake - verify token is:", verifyToken);
            callback(verifyToken);
        });
    }
}
