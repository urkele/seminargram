var Backbone = require('backbone'),
    BackboneRelational = require('backbone-relational'),
    Image = require('./Image.js').Image,
    Images = require('../collections/Images.js').Images;

var Tag = Backbone.RelationalModel.extend({
    idAttribute: "tagName",

    defaults: {
        tagName: "",
        sent: false
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
        this.listenTo(this.get('images'), 'add', function (img, images) {this.updateClients(img); this.limitImagesCount(images);});
    },

    updateClients: function (img) {
        var data = {};
        var tagName = this.get('tagName');
        data.images = img.toJSON();
        data.tagName = tagName;
        this.get('server').get('io').emitToRoom(tagName, 'newImage', data);
    },

    limitImagesCount: function (images) {
        var maxImages = 20;
        if (images.length > maxImages) {
            var count = images.length;
            var excess = count - maxImages;
            var excessImages = images.first(excess);
            images.remove(excessImages);
        }
    }
});

module.exports.Tag = Tag;