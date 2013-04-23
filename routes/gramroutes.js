var instalib = require('../lib/instalib.js')
  , async = require('async');

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
    console.log("@gramroutes.getInitialData - subscriptions are: ", subscriptions);
    // instalib.unsubscribeAllTags(subscriptions,function(result){
    //   console.log("result of unsubscribing is: ",result);
    // });
    var tags = req.query.tags;
    console.log("@gramroutes.getInitialData - for the follwing tags: ", tags);
    var tagsInfo = [];
    async.each( //should be repeated for same tags in one query.
      tags,
      function(tagName,eachCallback){ // the async.each iterator
        console.log("@gramroutes.getInitialData - for: ", tagName);
        var tag = new Tag(tagName);
        tagsInfo.push(tag);
        async.parallel({ // the async.parallel functions object. Contains the function to be called.
          getTagMediaCount: function(parallelCallback){
            console.log("@gramroutes.getTagMediaCount - for: ", tagName);
            instalib.getTagMediaCount(tagName,function(mediaCount){
              tag.data.tagMediaCount = mediaCount;
              parallelCallback();
            });
          },
          getImageInfo: function(parallelCallback){
            //get data about image
            console.log("@gramroutes.getImageInfo - for: ", tagName);
            async.series({ // the async.series functions object. Contains the function to be called.
              getImageUrl: function(seriesCallback){
                console.log("@gramroutes.getImageUrl - for: ", tagName);
                instalib.getRecentImageUrl(tagName,function(imageUrl){
                  tag.recentImage.imageUrl = imageUrl;
                  seriesCallback();
                });
              },
              getImageDominantColor: function(seriesCallback){
                console.log("@gramroutes.getImageDominantColor - for: ", tagName);
                tag.recentImage.imageDominantColor = "red";
                seriesCallback();
              },
              setTagDominantColor: function(seriesCallback){
                console.log("@gramroutes.setTagDominantColor - for: ", tagName);
                tag.data.tagDominantColor = tag.recentImage.imageDominantColor;
                seriesCallback();
              }
            }, //--end async.series functions object
            function(err, results){ // this is the 'seriesCallback' which is called after all function are complete.
              // results is an object of the results from each of the functions.
              if(err){
                console.log("@gramroutes.seriesCallback.err - error: ",err);
              };
              parallelCallback();
            }) //--end async.series
          },
          subscribeTag: function(parallelCallback){
            console.log("@gramroutes.subscribeTag - for: ",tagName);
            if(!subscriptions[tagName]){
              instalib.subscribeTag(tagName,function(subscribedTag,subscriptionId){ //TODO: handle error
                console.log("@gramroutes.subscribeTag - subscription details for: ",tagName, "are: ",subscribedTag, " and " ,subscriptionId);
                subscriptions[subscribedTag] = subscriptionId;
                parallelCallback();
              });
            }
            else {
              console.log("@gramroutes.subscribeTag - already subscribed to tag: ",tagName);
              parallelCallback();
            };
          }
        }, //--end async.parallel functions object
          function(err, results){ // this is the 'parallelCallback' which is called after all function are complete.
            // results is an object of the results from each of the functions.
            if(err){
              console.log("@gramroutes.parallelCallback.err - error: ",err);
            };
            eachCallback();
        }) //--end async.parallel
      }, //--end async.each iterator
      function(err){ //this is the 'eachCallback' which is called after all of the array members were processed
        if(err){
          console.log("@gramroutes.eachCallback.err - error: ",err);
        };
        console.log("@gramroutes.getInitialData - sending tagsInfo: ", tagsInfo)
        res.send(tagsInfo);
        initialDataSent = true;
      }) //--end async.each
  },
  handleSubscription: function(req,res){
    console.log("@gramroutes.handleSubscription");
    var Instagram = require('instagram-node-lib');
    Instagram.subscriptions.handshake(req, res,function(vt){
      console.log("@gramroutes.handleSubscription - verify token is: ", vt);
    });
  },
  gotSubscription: function(req,res){
    res.send(200);
    console.log("@gramroutes.gotSubscription",req.body);
    var updates = req.body;
    var tagNames = "";
    for (var i = 0; i < updates.length; i++) {
      tagNames += updates[i].object_id + "; ";
    };
    console.log("@gramroutes.gotSubscription - updated tags:",tagNames);
  },
  unsubscribeAll: function(){
    console.log("@gramroutes.unsubscribeAll");
    instalib.unsubscribeAll();
  }
};