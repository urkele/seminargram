var instalib = require('../lib/instalib.js')
  , async = require('async');

function Image(){
  this.imageURL = null;
  this.imageDominantColor = null;
}

function Tag(tagName) {
  this.tagName = tagName;
  this.recentImage = new Image(); //maybe should be this.images = {array of images}?
  this.data = {}
  this.data.tagDominantColor = null;
  this.data.tagMediaCount = null;
};

module.exports = {
  getIndex : function(req, res){
    res.render('index', { title: 'Seminargram' });
  },
  getInitialData: function(req,res){
    var tags = req.query.tagString.split(" ")
    console.log("@1 getTagsInfo: tags are: ", tags);
    var tagsInfo = {};
    async.each(
      tags,
      function(tagName,callback){
        tagsInfo[tagName] = new Tag(tagName);
        instalib.getTagMediaCount(tagName,function(mediaCount){
          tagsInfo[tagName].data.tagMediaCount = mediaCount;
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