var Backbone = require('backbone'),
    _ = require('underscore'),
    BackboneRelational = require('backbone-relational'),
    IGClient = require('./IGClient.js'),
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
        this.get('tags').add({tagName: tagName}, {merge: true});
        var tag = this.get('tags').get(tagName);
        this.get('igClient').getRecentUrls(tagName, null, function (err, imagesData, min_tag_id) {
            if (err) {
                tag.set('error', err);
            }
            else {
                // tag.min_tag_id = min_tag_id;
                tag.get('images').reset(imagesData);
            }
            console.log('there are %d images in tag "%s"', tag.get('images').length, tag.get('tagName'));
            callback(tag.toJSON());
        });
    }
});

var SultagitLive = SultagitBasic.extend({
    initialize: function () {
        this.set('igClient', new IGClient.Live());
    }
});


module.exports.Basic = SultagitBasic;
module.exports.Live = SultagitLive;