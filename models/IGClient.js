var Backbone = require('backbone'),
    BackboneRelational = require('backbone-relational'),
    Instagram = require('instagram-node-lib'),
    Dispatcher = require('./Dispatcher.js').Dispatcher;

var IGCLientBasic = Backbone.RelationalModel.extend({
    defaults: {
        client_id: '7f49a6767ca74605ab417538486c5a94',
        client_secret: '8c726fa0a72f48ae9cb83e0fbc0160bd',
        resolution: 'low_resolution'
    },

    initialize: function() {
        Instagram.set('client_id', this.get('client_id'));
        Instagram.set('client_secret', this.get('client_secret'));
        this.set('dispatcher', new Dispatcher());
        if (this.get('callback_url')) {
            Instagram.set('callback_url', this.get('callback_url'));
        }
    },

    getRecentUrls: function (tagName, min_tag_id, callback) {
        var resolution = this.get('resolution');
        var options = {
            name: tagName,
            error: function (errorMessage, errorObject, caller) {
                console.log("@IGClient.getRecentUrls - getting recent for tag '%s' returned an error", tagName, errorMessage, errorObject);
                callback({errorMessage: errorMessage, errorObject: errorObject});
            },
            complete: function (data, pagination) {
                var min_tag_id = null;
                var imagesData = [];
                for (var i = 0; i < data.length; i++) {
                    imagesData[i] = {};
                    if (data[i].images[resolution].url) {
                        imagesData[i].src = data[i].images[resolution].url;
                    }
                    else {
                        imagesData[i].src = data[i].images[resolution];
                    }
                    imagesData[i].id = data[i].id;
                }
                if (pagination && pagination.min_tag_id) {
                    min_tag_id = pagination.min_tag_id;
                }
                callback(null, imagesData, min_tag_id);
            }
        };
        if (min_tag_id) {
            options.min_tag_id = min_tag_id;
        }
        this.get('dispatcher').schedule(Instagram.tags.recent, options, Instagram.tags, false);
    }
});

var IGCLientLive = IGCLientBasic.extend({
    defaults: {
        client_id: '1c45259b0bae4ff58de047c07960286b',
        client_secret: '476d84bd632f4dc0b119257b8db9811c',
        callback_url: 'http://sultagit-8178.onmodulus.net/subscriptions',
        resolution: IGCLientBasic.prototype.defaults.resolution
    },

    initialize: function() {
        IGCLientBasic.prototype.initialize.apply(this);
    },

    subscribe: function (tagName, callback) {
        var options = {
            object_id: tagName,
            verify_token: 'token_' + tagName,
            error: function (errorMessage, errorObject, caller) {
                console.log ("@IGClient.subscribeTag - subscribing tag '%s' returned an error", tagName, errorMessage, errorObject);
                callback({errorMessage: errorMessage, errorObject: errorObject});
            },
            complete: function (subscription) {
                subscriptionId = subscription.id;
                callback(null, subscriptionId);
            }
        };
        this.get('dispatcher').schedule(Instagram.tags.subscribe, options, Instagram.tags, false);
    },

    handshake: function (req, res) {
        Instagram.subscriptions.handshake(req, res, function (verifyToken) {
        });
    },

    unsubscribeAll: function () {
        console.log("@IGClient.unsubscribeAll");
        var options = {
            dummy: "",
            error: function (errorMessage, errorObject, caller) {
                console.log("@IGClient.unsubscribeAll - error:", errorMessage, errorObject);
            },
            complete: function (data) {
                if (data !== null) {
                    console.log("@IGClient.unsubscribeAll - error. data is not null", data);
                }
            }
        };
        this.get('dispatcher').schedule(Instagram.subscriptions.unsubscribe_all, options, Instagram.subscriptions, true);
    }
});

module.exports.Basic = IGCLientBasic;
module.exports.Live = IGCLientLive;
