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

});

module.exports.Tag = Tag;