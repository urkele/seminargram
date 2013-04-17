var Instagram = require('instagram-node-lib');

var client_id = '83b37f581755407a9536df3aab8b9366';
var client_secret = '79385db4ea4241c1a23a7d4dd94eeb10';
var callback_url = 'http://seminargram.jit.su/subscriptions'; 

// Configure Instagram credentials
Instagram.set('client_id', client_id);
Instagram.set('client_secret', client_secret);
Instagram.set('callback_url', callback_url);

module.exports = {
getTagMediaCount: function(tagName,callback){
  // console.log("@3 getTagMediaCount: stating for: \"", tagName, "\"");
  var MediaCount = null;
  // var _this = this;
  Instagram.tags.info({
    name: tagName,
    error: function(errorMessage, errorObject, caller){
      // console.log("@4 getTagMediaCount: Instagram errorMessage: ", errorMessage, " errorObject: ", errorObject, " caller: ", caller);
      return(errorObject);
    },
    complete: function(data){
      // console.log("@4 getTagMediaCount: Instagram success. data: ", data);
      callback(data.media_count);
    }
  });
}

}
