var instalib = require('../lib/instalib.js')
  , async = require('async')
  , Instagram = require('instagram-node-lib');

var initialDataSent = false;
var subscriptions = {};
// var clients = {};

function Image(){
  this.imageUrl = null;
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
  //create socket session
  createSocket: function(server){
    io = require('socket.io').listen(server);
    io.sockets.on('connection', function (socket) {
      socket.emit('connection', 'connected');
      //need to  register the socket using the seesion id (clients.[sessionID] = socket). need to implement session store.;
    });
  },
  getIndex : function(req, res){
    res.render('index', { title: 'Seminargram' });
  },
  getInitialData: function(req,res){
    // first unsubscribe from all previous subscriptions.
    // TODO: this should be done more intelegently, first - to prevent unsubscribing other clients, second - maybe avoid unsbscribing and resubscribing to the same tags.
    console.log("subscriptions are: ", subscriptions);
    instalib.unsubscribeAllTags(subscriptions,function(result){
      console.log("result of unsubscribing is: ",result);
    });
    var tags = req.query.tags;
    console.log("@1 getInitialData for: ", tags);
    var tagsInfo = [];
    async.each( //should be repeated for same tags in one query.
      tags,
      function(tagName,eachCallback){ // the async.each iterator
        console.log("@2 getting info for: ", tagName);
        var tag = new Tag(tagName);
        tagsInfo.push(tag);
        async.parallel({ // the async.parallel functions object. Contains the function to be called.
          getTagMediaCount: function(parallelCallback){
            console.log("@21 getting TagMediaCount for: ", tagName);
            instalib.getTagMediaCount(tagName,function(mediaCount){
              tag.data.tagMediaCount = mediaCount;
              parallelCallback();
            });
          },
          getImageInfo: function(parallelCallback){
            //get data about image
            console.log("@21 getting image info for tag: ", tagName);
            async.series({ // the async.series functions object. Contains the function to be called.
              getImageUrl: function(seriesCallback){
                console.log("@211 getting image url for tag: ", tagName);
                instalib.getRecentImageUrl(tagName,function(imageUrl){
                  tag.recentImage.imageUrl = imageUrl;
                  seriesCallback();
                });
              },
              getImageDominantColor: function(seriesCallback){
                console.log("@212 getting image color for tag: ", tagName);
                tag.recentImage.imageDominantColor = "red";
                seriesCallback();
              },
              setTagDominantColor: function(seriesCallback){
                console.log("@213 setting tag color for tag: ", tagName);
                tag.data.tagDominantColor = tag.recentImage.imageDominantColor;
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
            if(!subscriptions.tagName){
              //subscribe to a tag
              instalib.subscribeTag(tagName,function(subscribedTag,subscriptionId){ //handle error
                subscriptions[subscribedTag] = subscriptionId;
                parallelCallback();
              });
            }
            else {
              console.log("@21 already subscribed to tag: ",tagName);
              parallelCallback();
            };
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
        initialDataSent = true;
      }) //--end async.each
  },
  gotSubscription: function(req,res){
    Instagram.tags.subscribe(req,res);
    console.log("got subscription: ", req);
  }
};