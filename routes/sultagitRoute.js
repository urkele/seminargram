var Sultagit = require('../models/Sultagit.js').Sultagit;

var sultagit = new Sultagit;

module.exports.getDummy = sultagit.getDummy;
module.exports.getIndex = sultagit.getIndex;
module.exports.getTags = sultagit.getTags;