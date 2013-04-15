var Instagram = require('instagram-node-lib');

// Configure Instagram credentials
Instagram.set('client_id', '83b37f581755407a9536df3aab8b9366');
Instagram.set('client_secret', '79385db4ea4241c1a23a7d4dd94eeb10');
Instagram.set('callback_url', 'http://seminargram.jit.su/subscriptions');


module.exports = {
  getTagInfo: function(req,res){
    console.log("getTagInfo");
    var info = new Array();
    var tags = req.query.tags.split(" ");
    for (var i = 0; i < tags.length; i++) {
      Instagram.tags.info({
      name: tags[i],
      error: function(errorMessage, errorObject, caller){
        console.log(errorMessage);
        res.send(errorObject);
      },
      complete: function(data){
        info[i] = data;
      }
      });
      res.send(info);
    }
  }
}
