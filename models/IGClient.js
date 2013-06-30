var Backbone = require('backbone'),
    Instagram = require('instagram-node-lib');

var IGCLientBasic = Backbone.Model.extend({
    defaults: {
        client_id: '83b37f581755407a9536df3aab8b9366',
        client_secret: '79385db4ea4241c1a23a7d4dd94eeb10',
        callback_url: 'http://seminargram.jit.su/subscriptions',
        resolution: 'low_resolution'
    },

    initialize: function() {
/*        console.log('Polling - client_id', this.get('client_id'));
        console.log('Polling - client_secret', this.get('client_secret'));
        console.log('Polling - callback_url', this.get('callback_url'));
        console.log('Polling - resolution', this.get('resolution'));*/
        Instagram.set('client_id', this.get('client_id'));
        Instagram.set('client_secret', this.get('client_secret'));
        // Instagram.set('callback_url', this.get('callback_url'));
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
                var imagesUrls = [];
                for (var i = 0; i < data.length; i++) {
                    if (data[i].images[resolution].url) {
                        imagesUrls[i] = data[i].images[resolution].url;
                    }
                    else {
                        imagesUrls[i] = data[i].images[resolution]
                    }
                };
                if (pagination && pagination.min_tag_id) {
                    min_tag_id = pagination.min_tag_id;
                }
                callback(null, imagesUrls, min_tag_id);
            }
        };
        if (min_tag_id) {
            options.min_tag_id = min_tag_id;
        }
        // igRequestsDispatcher.schedule(Instagram.tags.recent, Instagram.tags, options);
        Instagram.tags.recent(options);
    },
})

var IGCLientLive = IGCLientBasic.extend({
    defaults: {
        client_id: 'ab9c4ad6b1ca4a7b9b0b037494004307',
        client_secret: '38ab89bec6864c0ca45d716e2943c8da',
        callback_url: 'http://sultag.it/subscriptions',
        resolution: IGCLientBasic.prototype.defaults.resolution
    },

    initialize: function() {
        IGCLientBasic.prototype.initialize.apply(this);
    }
})

module.exports.Basic = IGCLientBasic;
module.exports.Live = IGCLientLive;
