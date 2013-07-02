var Backbone = require('backbone'),
    BackboneRelational = require('backbone-relational'),
    Tag = require('../models/Tag.js').Tag;

Tags = Backbone.Collection.extend({
    model: Tag
});

module.exports.Tags = Tags;