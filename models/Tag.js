var Backbone = require('backbone'),
    BackboneRelational = require('backbone-relational'),
    Image = require('./Image.js').Image,
    Images = require('../collections/Images.js').Images;

var Tag = Backbone.RelationalModel.extend({
    idAttribute: "tagName",

    defaults: {
        tagName: ""
    },

    relations: [{
        type: Backbone.HasMany,
        key: 'images',
        relatedModel: Image,
        collectionType: Images,
        reverseRelation: {
            key: 'imageOf',
            includeInJSON: false
        }
    }],

    initialize: function () {
        this.listenTo(this.get('images'), 'add', this.updateClients);
    },

    updateClients: function (img) {
        var data = {};
        var tagName = this.get('tagName');
        data.images = img.toJSON();
        data.tagName = tagName;
        this.get('server').get('io').emitToRoom(tagName, 'newImage', data);
    }
});

module.exports.Tag = Tag;