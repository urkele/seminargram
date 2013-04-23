var Instagram = require('instagram-node-lib');

var client_id = '83b37f581755407a9536df3aab8b9366';
var client_secret = '79385db4ea4241c1a23a7d4dd94eeb10';
var callback_url = 'http://seminargram.jit.su/subscriptions';
var resolution = "low_resolution" // [thumbnail|low_resolution|standard_resolution]

// Configure Instagram credentials
Instagram.set('client_id', client_id);
Instagram.set('client_secret', client_secret);
Instagram.set('callback_url', callback_url);

module.exports = {
  getTagMediaCount: function(tagName,callback){
    Instagram.tags.info({
      name: tagName,
      error: function(errorMessage, errorObject, caller){
        console.log("@instalib.getTagMediaCount - error:",errorMessage, errorObject);
        return errorObject;
      },
      complete: function(data){
        callback(data.media_count);
      }
    });
  },
  getRecentImageUrl: function(tagName,callback){
    Instagram.tags.recent({
      name: tagName,
      error: function(errorMessage, errorObject, caller){
        console.log("@instalib.getRecentImageUrl - error:",errorMessage, errorObject);
        return errorObject;
      },
      complete: function(data){
        var latestTime = 0;
        var latestIndex = null;
        var latestUrl = null;
        for (var i = 0; i < data.length; i++) {
          var currentTime = data[i].created_time
          if (currentTime > latestTime) {
            latestTime = currentTime;
            latestUrl = data[i].images[resolution].url
          };
        };
        // maybe the image's width and height should be passed on too?
        callback(latestUrl);
      }
    })
  },
  subscribeTag: function(tagName,callback){
    console.log("@instalib.subscribeTag - for", tagName);
    var token = "token_"+tagName;
    Instagram.tags.subscribe({
      object_id: tagName,
      verify_token: token,
      error: function(errorMessage, errorObject, caller){
        console.log("@instalib.subscribeTag - error:",errorMessage, errorObject);
        return errorObject;
      },
      complete: function(subscription){
        subscribedTag = subscription.object_id;
        subscriptionId = subscription.id;
        callback(subscribedTag,subscriptionId);
      }    
    });
  },
  /*unsubscribeAllTags: function(subscriptions,callback){
    console.log("@instalib.unsubscribeAllTags");
    for (var tagName in subscriptions) {
      subscriptionID = subscriptions[tagName];
      console.log("unsubscribing from tag: ",tagName," with ID: ", subscriptionID);
      var unsubscribtion = Instagram.tags.unsubscribe({id: subscriptionID});
      if (unsubscribtion !== null) {
        console.log("error unsubscribing: " ,unsubscribtion);
      };
      callback(unsubscribtion);
    };
  },*/
  unsubscribeAll: function(callback){
    console.log("@instalib.unsubscribeAll");
    Instagram.subscriptions.unsubscribe_all({
      dummy: "",
      error: function(errorMessage, errorObject, caller){
        console.log("@instalib.unsubscribeAll - error:",errorMessage, errorObject);
        callback(errorObject);
      },
      complete: function(data){
        callback(data);
      }
    });
  },
  handshake: function(req,res,callback){
    Instagram.subscriptions.handshake(req, res,function(verifyToken){
      console.log("@instalib.handshake - verify token is:", verifyToken);
      callback(verifyToken);
    });
  }
}
