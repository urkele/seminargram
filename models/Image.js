var Backbone = require('backbone'),
    BackboneRelational = require('backbone-relational');

var Image = Backbone.RelationalModel.extend({
    idAttribute: "id"
});

module.exports.Image = Image;