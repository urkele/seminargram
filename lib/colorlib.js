// http://stackoverflow.com/questions/5171213/load-vanilla-javascript-libraries-into-node-js
module.exports = {
  getImageDominantColor: function(imageUrl,callback){
    var imageColor = [255,0,0];
    console.log("@colorlib.getImageDominantColor - color of %s is %o",imageUrl,imageColor);
    callback(imageColor);
  },
  getTagDominantColor: function(tagName,callback){
    var tagColor = [0,255,0];
    console.log("@colorlib.getTagDominantColor - color of %s is %o",tagName,tagColor);
    callback(tagColor);
  }
}