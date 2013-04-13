var Instagram = require('instagram-node-lib');


module.exports = {
  init: function(){
    console.log("initiate instagram session");
    Instagram.set('client_id', '23aa192e9cbb4c59b5f609094de5cf3d');
    Instagram.set('client_secret', '7e7bbf44ee8b4403921a0f6f64646dc0');
    Instagram.set('callback_url', 'http://seminargram.jit.su');
  },
  getTagInfo: function(req,res){
    console.log("getTagInfo");
    var tagName = req.query;
    // res.send(tagName);
    var info = Instagram.tags.info({
      name: 'blue',
      complete: function(data){
        res.send(data);
      },
      error: function(errorMessage, errorObject, caller){
        res.send(errorObject);
      }
    });
    // res.send(info);
  }
}