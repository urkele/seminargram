var Backbone = require('backbone'),
    BacboneRleational = require('backbone-relational');


var Tag = Backbone.RelationalModel.extend({
    defaults: {
        tagName: ""
    },

    idAttribute: "tagName"
})

module.exports.Tag = Tag;