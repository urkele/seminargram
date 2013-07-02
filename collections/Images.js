var Backbone = require('backbone'),
    BackboneRelational = require('backbone-relational'),
    Image = require('../models/Image.js').Image;

Images = Backbone.Collection.extend({
    model: Image
});

module.exports.Images = Images;