var gramlib = require('../lib/gramlib.js')
  , async = require('async');

function Tag(tagName) {
  this.name = tagName;
  this.mediaCount = null;
  this.color = null;

};

module.exports = {
  getIndex : function(req, res){
    res.render('index', { title: 'Seminargram' });
  },
  getTagsInfo: function(req,res){
    var tags = req.query.tagString.split(" ")
    console.log("@1 getTagsInfo: tags are: ", tags);
    var tagsInfo = {};
    async.each(
      tags,
      function(tagName,callback){
        tagsInfo[tagName] = new Tag(tagName);
        gramlib.getTagMediaCount(tagName,function(mediaCount){
          tagsInfo[tagName].mediaCount = mediaCount;
          callback();
        });
      },
      function(err){
        if(err){
          console.log("err: ",err);
        };
        console.log("@5 getTagsInfo: tagsInfo is: ", tagsInfo)
        res.send(tagsInfo);
      })
  }
}