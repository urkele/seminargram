var Instagram = require('instagram-node-lib');

var client_id = '83b37f581755407a9536df3aab8b9366';
var client_secret = '79385db4ea4241c1a23a7d4dd94eeb10';
var callback_url = 'http://seminargram.jit.su/subscriptions'; 

// Configure Instagram credentials
Instagram.set('client_id', client_id);
Instagram.set('client_secret', client_secret);
Instagram.set('callback_url', callback_url);


module.exports = {
  getTagInfo: function(req,res){
    console.log("getTagInfo");
    var info = new Array();
    var tags = req.query.tags.split(" ");
    for (var i = 0; i < tags.length; i++) {
      var _this = this;
      Instagram.tags.info({
        name: tags[i],
        error: function(errorMessage, errorObject, caller){
          console.log(errorMessage);
          res.send(errorObject);
        },
        complete: function(data){
          _this.info[_this.i] = data;
        }
      });
      res.send(info);
    }
  }
}
