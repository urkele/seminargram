var Backbone = require('backbone'),
    _ = require('underscore'),
    BackboneRelational = require('backbone-relational'),
    IGClient = require('./IGClient.js'),
    Socket = require('./Socket.js').Socket,
    Tag = require('./Tag.js').Tag,
    Tags = require('../collections/Tags.js').Tags;

var SultagitBasic = Backbone.RelationalModel.extend({
    relations: [{
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

    getTag: function (tagName, callback) {
        var _this = this;
        this.unusedTagsCleanup(function (err) {
            if (err) {
                console.error('@SultagitBasic.getTag - returned an error from unusedTagsCleanup', err);
                callback({tagName: tagName, error: err});
                return;
            }
            if (!_this.get('tags')) {
                console.error('@SultagitBasic.getTag \'%s\'- cannot get \'tags\'', tagName);
                callback({tagName: tagName, error:{errorMessage: 'error getting attributes', errorObject: 'cannot get \'tags\''}});
            }
            _this.get('tags').add({tagName: tagName}, {merge: true}); //not sure I need merge. we can skip adding if exists
            var tag = _this.get('tags').get(tagName);
            _this.get('igClient').getRecentUrls(tagName, null, function (err, imagesData, min_tag_id) {
                if (err) {
                    tag.set('error', err);
                }
                else {
                    tag.min_tag_id = min_tag_id;
                    if (tag.get('images')) {
                        tag.get('images').add(imagesData, {silent: true});
                    }
                    else {
                        console.error('@SultagitBasic.getTag - unable to get \'images\' attribute for tag', tagName);
                        tag.set('error', {errorMessage: 'error getting attributes', errorObject: 'unable to get \'images\' attribute for tag'});
                    }
                }
                callback(tag.toJSON());
                tag.set('sent', true);
            });
        });
    },

    unusedTagsCleanup: function (callback) {
        var tagsToRemove = [];
        if (!this.get('tags')) {
            console.error('@SultagitBasic.unusedTagsCleanup - cannot get \'tags\'');
            callback({errorMessage: 'error getting attributes', errorObject: 'cannot get \'tags\''});
        }
        var validTags = this.get('tags').where({sent: true});
        _.each(validTags, function (tag) {
            tagsToRemove.push(tag.get('tagName'));
        });
        if (tagsToRemove.length > 0) {
            for (var i = 0; i < tagsToRemove.length; i++) {
                this.removeTag(tagsToRemove[i], function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                });
            }
            callback(null);
        }
        else {
            callback(null);
        }
    },

    removeTag: function (tagName, callback) {
        if (!this.get('tags')) {
            console.error('@SultagitBasic.removeTag \'%s\' - cannot get \'tags\'', tagName);
            callback({errorMessage: 'error getting attributes', errorObject: 'cannot get \'tags\''});
        }
        var tag = this.get('tags').get(tagName);
        if (!tag) {
            console.error('@SultagitBasic.removeTag - tag \'%s\' not found', tagName);
            callback({errorMessage: 'cannot remove tag', errorObject: 'tag not found'});
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
    relations: function () {
        var rel = SultagitBasic.prototype.relations;
        rel.push({
            type: Backbone.HasOne,
            key: 'io',
            relatedModel: Socket,
            reverseRelation: {
                type: Backbone.HasOne,
                key: 'master'
            }
        });
        return rel;
    }(),

    defaults: {
        tagsLimit: (process.env.NODE_ENV == 'production') ? 30 : 8,
        maxUpdateFrequency: 3000 //ms
    },

    initialize: function (server) {
        this.set('igClient', new IGClient.Live());
        this.set('io', new Socket(server));
    },

    getTag: function (tagName, callback) {
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
            SultagitBasic.prototype.getTag.call(this, tagName, callback);
        }
    },

    unusedTagsCleanup: function (callback) {
        // get list of valid tags
        var tagsToRemove = [];
        if (!this.get('tags')) {
            console.error('@SultagitLive.unusedTagsCleanup - cannot get \'tags\'');
            callback({errorMessage: 'error getting attributes', errorObject: 'cannot get \'tags\''});
        }
        this.get('tags').each(function (tag) {
            if (tag.get('subscriptionId') || tag.get('error')) {
                tagsToRemove.push(tag.get('tagName'));
            }
        });

        // remove the tags
        if (tagsToRemove.length > 0) {
            for (var i = 0; i < tagsToRemove.length; i++) {
                this.removeTag(tagsToRemove[i], function (err) {
                    if (err) {
                        console.error('@SultagitLive.unusedTagsCleanup - remove returned an error', err);
                        callback(err);
                        return;
                    }
                });
            }
            callback(null);
        }
        else {
            callback(null);
        }
    },

    removeTag: function (tagName, callback, sid) {
        if (!this.get('tags')) {
            console.error('@SultagitLive.removeTag \'%s\' - cannot get \'tags\'', tagName);
            callback({errorMessage: 'error getting attributes', errorObject: 'cannot get \'tags\''});
        }
        var tag = this.get('tags').get(tagName);
        if (!tag) {
            callback({errorMessage: 'cannot remove tag', errorObject: 'tag not found'});
            return;
        }

        // leave room
        if (sid) {
            this.get('io').leaveRoom(sid, tagName);
        }

        // test to see if more there are other client subscribed to this tag
        var roomClients = this.get('io').listRoomClients(tagName);
        if (roomClients.length > 0) {
            callback(null);
            return;
        }
        else {
            // ig unsubscribe 
            var subscriptionId = tag.get('subscriptionId');
            if (subscriptionId) {
                this.get('igClient').unsubscribe(subscriptionId, function (error) {
                    if (error) {
                        tag.set('error',error);
                        return;
                    }
                });
            }
            else {
                console.log('@SultagitLive.removeTag - tag \'%s\' has no subscriptionId', tagName);
            }

            // remove tag model
            this.get('tags').remove(tag);
            callback(null);
        }
    },

    reachedTagsLimit: function () {
        return this.get('tags').length < this.get('tagsLimit') ? false : true;
    },

    update: function (payload) {
        //TODO: maybe add a callback that returns an error if tag is not found and will respond with error to instagram's post
        if (!this.get('tags')) {
            console.error('@SultagitLive.update \'%s\' - cannot get \'tags\'');
            return;
        }
        _.each(payload, function(element, index, payload) {
            var tagName = element.object_id;
            var tag = this.get('tags').get(tagName);
            if (!tag) {
                console.error('@SultagitLive.update - couldn\'t find tag', tagName);
                return;
            }

            // avoid one tag to update too frequently.
            var updateFrequency = new Date().getTime() - tag.get('lastUpdate');
            if (updateFrequency >= this.get('maxUpdateFrequency')) {
                this.get('igClient').getRecentUrls(tagName, tag.min_tag_id ? tag.min_tag_id : null, function (err, imagesData, min_tag_id) {
                    if (err) {
                        tag.set('error', err);
                    }
                    else {
                        tag.min_tag_id = min_tag_id;
                        tag.get('images').add(imagesData);
                    }
                });
                tag.set('lastUpdate', new Date().getTime());
            }
        }, this);
    },

    subscribe: function (tagName, sid) {
        if (!this.get('tags')) {
            console.error('@SultagitLive.subscribe \'%s\' - cannot get \'tags\'', tagName);
            return;
        }
        var tag = this.get('tags').get(tagName);
        if (!tag) {
            console.error('@SultagitLive.subscribe - couldn\'t find tag', tagName);
            return;
        }
        if (!tag.get('subscriptionId')) {
            var _this = this;
            this.get('igClient').subscribe(tagName, function (err, subscriptionId) {
                if (!err) {
                    // register client to the tags' room
                    _this.get('io').joinRoom(sid, tagName);

                    tag.set('subscriptionId', subscriptionId);
                }
                else {
                    console.error('@SultagitLive.subscribe - igClient.subscribe returned an error', err);
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
    }
});


module.exports.Basic = SultagitBasic;
module.exports.Live = SultagitLive;