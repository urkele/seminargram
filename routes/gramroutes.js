var instalib = require('../lib/instalib.js')
  , async = require('async');

function Image(){
  this.imageURL = null;
  this.imageDominantColor = null;
}

function Tag(tagName) {
  this.tagName = tagName;
  this.recentImage = new Image(); //maybe should be this.images = {array of images}?
  this.data = {}
  this.data.tagDominantColor = null;
  this.data.tagMediaCount = null;
};

module.exports = {
  getIndex : function(req, res){
    res.render('index', { title: 'Seminargram' });
  },
  getInitialData: function(req,res){
    var tags = req.query.tagString.split(" ")
    console.log("@1 getInitialData for: ", tags);
    var tagsInfo = {};
    async.each(
      tags,
      function(tagName,eachCallback){ // the async.each iterator
        console.log("@2 getting info for: ", tagName);
        tagsInfo[tagName] = new Tag(tagName);
        async.parallel({ // the async.parallel functions object. Contains the function to be called.
          getTagMediaCount: function(parallelCallback){
            console.log("@21 getting TagMediaCount for: ", tagName);
            instalib.getTagMediaCount(tagName,function(mediaCount){
              tagsInfo[tagName].data.tagMediaCount = mediaCount;
              parallelCallback();
            });
          },
          getImageInfo: function(parallelCallback){
            //get data about image
            console.log("@21 getting image info for tag: ", tagName);
            async.series({ // the async.series functions object. Contains the function to be called.
              getImageUrl: function(seriesCallback){
                console.log("@211 getting image url for tag: ", tagName);
                tagsInfo[tagName].recentImage.imageURL = "URL";
                seriesCallback();
              },
              getImageDominantColor: function(seriesCallback){
                console.log("@212 getting image color for tag: ", tagName);
                tagsInfo[tagName].recentImage.imageDominantColor = "red";
                seriesCallback();
              },
              setTagDominantColor: function(seriesCallback){
                console.log("@213 setting tag color for tag: ", tagName);
                tagsInfo[tagName].data.tagDominantColor = tagsInfo[tagName].recentImage.imageDominantColor;
                seriesCallback();
              }
            }, //--end async.series functions object
            function(err, results){ // this is the 'seriesCallback' which is called after all function are complete.
              // results is an object of the results from each of the functions.
              if(err){
                console.log("err: ",err);
              };
              parallelCallback();
            }) //--end async.series
          },
          subscribeTag: function(parallelCallback){
            console.log("@21 subscribing to tag: ",tagName);
            //subscribe to a tag
            parallelCallback();
          }
        }, //--end async.parallel functions object
          function(err, results){ // this is the 'parallelCallback' which is called after all function are complete.
            // results is an object of the results from each of the functions.
            if(err){
              console.log("err: ",err);
            };
            eachCallback();
        }) //--end async.parallel
      }, //--end async.each iterator
      function(err){ //this is the 'eachCallback' which is called after all of the array members were processed
        if(err){
          console.log("err: ",err);
        };
        console.log("@3 sending tagsInfo: ", tagsInfo)
        res.send(tagsInfo);
      }) //--end async.each
  }
}