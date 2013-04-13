var Instagram = require('instagram-node-lib');

var client_id = '23aa192e9cbb4c59b5f609094de5cf3d';
var client_secret = '7e7bbf44ee8b4403921a0f6f64646dc0';
var callback_url = 'http://seminargram.jit.su';

module.exports = {
  init: function(){
    console.log("initiate instagram session");
    Instagram.set('client_id', client_id);
    Instagram.set('client_secret', client_secret);
    Instagram.set('callback_url', callback_url);
  },
  getTagInfo: function(){
    console.log("winning");
    // var tagName = req.query.tagName;
    // var info = Instagram.tags.info({ name: tagName });
    // console.log(info);
  }
}