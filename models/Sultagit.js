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
        var _this = this;
        this.unusedTagsCleanup(function () {
            _this.get('tags').add({tagName: tagName}, {merge: true}); //not sure I need merge. we can skip adding if exists
            var tag = _this.get('tags').get(tagName);
            _this.get('igClient').getRecentUrls(tagName, null, function (err, imagesData, min_tag_id) {
                if (err) {
                    tag.set('error', err);
                }
                else {
                    tag.min_tag_id = min_tag_id;
                    tag.get('images').add(imagesData, {silent: true});
                }
                callback(tag.toJSON());
                tag.set('sent', true);
            });
        });
    },

    unusedTagsCleanup: function (callback) {
        var tagsToRemove = [];
        var validTags = this.get('tags').where({sent: true});
        _.each(validTags, function (tag, index) {
            tagsToRemove[index] = tag.get('tagName');
        });
        if (tagsToRemove.length > 0) {
            for (var i = 0; i < tagsToRemove.length; i++) {
                this.removeTags(tagsToRemove[i], callback);
            }
        }
        else {
            callback();
        }
        callback();
    },

    removeTags: function (tagName, callback) {
        var tag = this.get('tags').get(tagName);
        if (!tag) {
            var err = {errorMessage: 'tag not found', errorObject: tagName};
            callback(err);
        }
        else {
            this.get('tags').remove(tag);
            callback(null);
        }
    },

    //development
    getData: function (callback) {
        var data = {};
        data.tags = this.get('tags').toJSON();
        if (this.get('io')){
            data.rooms = this.get('io').listRooms();
        }
        callback(data);
    }
});

var SultagitLive = SultagitBasic.extend({

    defaults: {
        tagsLimit: (process.env.NODE_ENV == 'production') ? 30 : 2
    },

    initialize: function (server) {
        this.set('igClient', new IGClient.Live());
        this.set('io', new Socket(server));
    },

    getTags: function (tagName, callback) {
        if (this.get('tags').get(tagName)) {
            // don't need to get images. just send back the data in the model.
            callback(this.get('tags').get(tagName).toJSON());
        }
        else {
            if (this.reachedTagsLimit()) {
                var err = {
                    errorMessage: 'tagsLimitReached',
                    errorObject: 'Tags Limit ('+ this.get('tagsLimit') + ') Reached.\nTry again later'
                };
                callback({tagName: tagName, error: err});
                return;
            }
            SultagitBasic.prototype.getTags.call(this, tagName, callback);
        }
    },

    unusedTagsCleanup: function (callback) {
        // get list of valis tags
        var tagsToRemove = [];
        this.get('tags').each(function (tag, index) {
            if (tag.get('subscriptionId') || tag.get('error')) {
                tagsToRemove[index] = tag.get('tagName');
                // return tag.get('tagName');
            }
        });

        // remove the tags
        if (tagsToRemove.length > 0) {
            for (var i = 0; i < tagsToRemove.length; i++) {
                this.removeTags(tagsToRemove[i], callback);
            }
        }
        else {
            callback();
        }
    },

    reachedTagsLimit: function () {
        return this.get('tags').length < this.get('tagsLimit') ? false : true;
    },

    update: function (payload) {
        _.each(payload, function(element, index, payload) {
            var tagName = element.object_id;
            var tag = this.get('tags').get(tagName);
            if (!tag) {
                console.log('@update - couldn\'t find tag', tagName);
                return;
            }
            this.get('igClient').getRecentUrls(tagName, tag.min_tag_id ? tag.min_tag_id : null, function (err, imagesData, min_tag_id) {
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
            var _this = this;
            this.get('igClient').subscribe(tagName, function (err, subscriptionId) {
                if (!err) {
                    //register client to the tags' room
                    _this.get('io').joinRoom(sid, tagName);

                    tag.set('subscriptionId', subscriptionId);
                }
            });
        }
        else {
            //register client to the tags' room
            this.get('io').joinRoom(sid, tagName);
        }

    },

    subscriptionHandshake: function (req, res) {
        this.get('igClient').handshake(req, res);
    },

    unsubscribeAll: function () {
        this.get('igClient').unsubscribeAll();
    },

    removeTags: function (tagName, callback, sid) {
        var tag = this.get('tags').get(tagName);
        var err = null;
        if (!tag) {
            err = {errorMessage: 'tag not found', errorObject: tagName};
            callback(err);
            return;
        }

        // leave room
        if (sid) {
            this.get('io').leaveRoom(sid, tagName);
        }

        // test to see if more there are other client subscribed to this tag
        var roomClients = this.get('io').listRoomClients(tagName);
        if (roomClients.length > 0) {
            // console.log('there are still clients waiting to hear from tag', tagName);
            callback(null);
            return;
        }

        else {
            // ig unsubscribe 
            var subscriptionId = tag.get('subscriptionId');
            if (subscriptionId) {
                this.get('igClient').unsubscribe(subscriptionId, function (error) {
                    if (error) {
                        callback(error);
                        return;
                    }
                });
            }
            else {
                err = ({errorMessage: 'noSubscriptionId', errorObject: 'tag \''+tagName+'\' has no subscriptionId'});
            }

            // remove tag model
            this.get('tags').remove(tag);
            callback(err);
        }
    }
});


module.exports.Basic = SultagitBasic;
module.exports.Live = SultagitLive;