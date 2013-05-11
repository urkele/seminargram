// http://stackoverflow.com/questions/5171213/load-vanilla-javascript-libraries-into-node-js
module.exports = {
    getImageDominantColor: function (imageUrl, callback) {
        var imageColor = [255, 0, 0];
        callback(null, imageColor);
    },
    getTagDominantColor: function (tagName, callback) {
        var tagColor = [0, 255, 0];
        callback(null, tagColor);
    }
}