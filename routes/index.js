var ig = rquire('./lib/instagram.js');

module.exports = {
  index: function(req, res){
    res.render('index', { title: 'Seminargram' });
  },
  queryTag: function(query){
    var tags = req.query.split(" ");
    var tagInfo = [];
    for(var i=0; i < tags.length; i++){
      tagInfo[i] = ig.getTagInfo(tags[i]);
    }
  }
};