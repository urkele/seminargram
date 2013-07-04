var Backbone = require('backbone'),
    _ = require('underscore'),
    BackboneRelational = require('backbone-relational'),
    IGClient = require('./IGClient.js'),
    Socket = require('./Socket.js').Socket,
    Tag = require('./Tag.js').Tag,
    Tags = require('../collections/Tags.js').Tags;

var SultagitBasic = Backbone.RelationalModel.extend({
    relations: [
    {
        type: Backbone.HasMany,
        key: 'tags',
        relatedModel: Tag,
        collectionType: Tags,
        reverseRelation: {
            type: Backbone.HasOne,
            key: 'server',
            includeInJSON: false
        }
    }],

    initialize: function () {
        this.set('igClient', new IGClient.Basic());
    },

    getTags: function (tagName, callback) {
        this.get('tags').add({tagName: tagName}, {merge: true}); //not sure I need merge. we can skip adding if exists
        var tag = this.get('tags').get(tagName);
        this.get('igClient').getRecentUrls(tagName, null, function (err, imagesData, min_tag_id) {
            if (err) {
                tag.set('error', err);
            }
            else {
                tag.min_tag_id = min_tag_id;
                tag.get('images').add(imagesData, {silent: true});
            }
            callback(tag.toJSON());
        });
    }
});

var SultagitLive = SultagitBasic.extend({
    initialize: function (server) {
        this.set('igClient', new IGClient.Live());
        this.set('io', new Socket(server));
    },

    getTags: function (tagName, callback) {
        if (this.get('tags').get(tagName)) {
            // don't need to get images. just add client to room and send back the data in the model.
            callback(this.get('tags').get(tagName).toJSON());
        }
        else {
            SultagitBasic.prototype.getTags.call(this, tagName, callback);
        }
    },

    update: function (payload) {
        _.each(payload, function(element, index, payload) {
            var tagName = element.object_id;
            var tag = this.get('tags').get(tagName);
            this.get('igClient').getRecentUrls(tagName, tag.get('min_tag_id'), function (err, imagesData, min_tag_id) {
            if (err) {
                tag.set('error', err);
            }
            else {
                tag.min_tag_id = min_tag_id;
                tag.get('images').add(imagesData);
            }
        });
        }, this);
    },

    subscribe: function (tagName, sid) {
        var tag = this.get('tags').get(tagName);
        if (!tag.get('subscriptionId')) {
            this.get('igClient').subscribe(tagName, function (err, subscriptionId) {
                if (!err) {
                    tag.set('subscriptionId', subscriptionId);
                }
            });
        }

        //register client to the tags' room
        this.get('io').joinRoom(sid, tagName);
    },

    subscriptionHandshake: function (req, res) {
        this.get('igClient').handshake(req, res);
    },

    unsubscribe: function (isAll, tagName) {
        if (isAll) {
            this.get('igClient').unsubscribeAll();
        }
        else {
            if (tagName) {
                subscriptionId = this.get('tags').get(tagName).get('subscriptionId');
                if (subscriptionId) {
                    this.get('igClient').unsubscribe(subscriptionId);
                }
                else {
                    console.log('tag "%s" has no subscriptionId', tagName);
                }
            }
        }
    }
});


module.exports.Basic = SultagitBasic;
module.exports.Live = SultagitLive;