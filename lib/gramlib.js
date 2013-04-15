var Instagram = require('instagram-node-lib');

var client_id = '83b37f581755407a9536df3aab8b9366';
var client_secret = '79385db4ea4241c1a23a7d4dd94eeb10';
var callback_url = 'http://seminargram.jit.su/subscriptions'; 

// Configure Instagram credentials
Instagram.set('client_id', client_id);
Instagram.set('client_secret', client_secret);
Instagram.set('callback_url', callback_url);

module.exports = {
getTagMediaCount: function(tagName){
  console.log("getTagMediaCount: "+tagName);
  var MediaCount = null;
  var _this = this;
  Instagram.tags.info({
    name: tagName,
    error: function(errorMessage, errorObject, caller){
      console.log("instabad");
      console.log(errorObject);
      return(errorObject);
    },
    complete: function(data){
      console.log("Instagood");
      console.log(data.media_count);
      _this.MediaCount = data.media_count;
    }
  });
  console.log(MediaCount);
  return(MediaCount);
}

}
