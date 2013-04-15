var Instagram = require('instagram-node-lib');

var client_id = '83b37f581755407a9536df3aab8b9366';
var client_secret = '79385db4ea4241c1a23a7d4dd94eeb10';
var callback_url = 'http://seminargram.jit.su/subscriptions'; 

// Configure Instagram credentials
Instagram.set('client_id', client_id);
Instagram.set('client_secret', client_secret);
Instagram.set('callback_url', callback_url);

function getTagMediaCount(tagName){
  console.log("getTagMediaCount: "+tagName);
  var MediaCount = null;
  var _this = this;
  Instagram.tags.info({
    name: tagName,
    error: function(errorMessage, errorObject, caller){
      return(errorObject);
    },
    complete: function(data){
      _this.MediaCount = data.media_count;
    }
  });
  console.log(MediaCount);
  return(MediaCount);
}

module.exports = {
  getTagsInfo: function(req,res){
    tags = req.query.tags.split(" ")
    tagsInfo = {};
    for (var i = 0; i < tags.length; i++) {
      tagsInfo.tags[i].data.tagMediaCount = getTagMediaCount(tags[i]);
    };
    io.emit(debug, tagsInfo);
    res.end();
  }
}
