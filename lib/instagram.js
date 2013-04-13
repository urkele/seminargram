var Instagram = require('instagram-node-lib');


module.exports = {
  begin: function(){
    console.log("initiate instagram session");
    // Instagram.set('client_id', '83b37f581755407a9536df3aab8b9366');
    // Instagram.set('client_secret', '79385db4ea4241c1a23a7d4dd94eeb10');
    // return true;
    // Instagram.set('callback_url', 'http://seminargram.jit.su');
  },
  getTagInfo: function(req,res){
    Instagram.set('client_id', '83b37f581755407a9536df3aab8b9366');
    Instagram.set('client_secret', '79385db4ea4241c1a23a7d4dd94eeb10');
    console.log("getTagInfo");
    var tagName = req.query;
    // res.send(tagName);
    var info = Instagram.tags.info({
      name: 'blue',
      complete: function(data){
        res.send(data);
      },
      error: function(errorMessage, errorObject, caller){
        console.log(errorMessage);
        res.send(errorObject);
      }
    });
    // res.send(info);
  }
}