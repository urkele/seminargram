var instalib = require('../lib/instalib.js');

/*
 * GET home page.
 */
module.exports = {
  getIndex : function(req, res){
    res.render('index', { title: 'Seminargram' });
  },
  getTagsInfo: function(req,res){
    var tags = req.body.tagString.split(" ")
    console.log(tags);
    var tagsInfo = {};
    for (var i = 0; i < tags.length; i++) {
      var tagName = tags[i];
      tagsInfo.tagName = instalib.getTagMediaCount(tagName);
    };
    return tagsInfo;
  }
}