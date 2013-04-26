var async = require('async')
  , instalib = require('../lib/instalib.js')
  , colorlib = require('../lib/colorlib.js');

var initialDataSent = false;
var tags = {};
// var clients = {};
// var socket1 = {}; //an object to hols a single socket. just for now...

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
      // socket1 = socket;
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
    // console.log("@gramroutes.getInitialData - tags array starts with:", tags);
    // instalib.unsubscribeAllTags(subscriptions,function(result){
    //   console.log("result of unsubscribing is:",result);
    // });
    var requestedTags = req.query.tags;
    console.log("@gramroutes.getInitialData - for the follwing tags:", requestedTags);
    var tagsInfo = [];
    async.each( //should be repeated for same tags in one query.
      requestedTags,
      function(tagName,eachCallback){ // the async.each iterator
        console.log("@gramroutes.getInitialData - for:", tagName);
        if(tags[tagName]){
          tag = tags[tagName];
        }
        else {
          tag = new Tag(tagName);
          tags[tagName] = tag;
        }
        tagsInfo.push(tag);
        async.parallel({ // the async.parallel functions object. Contains the function to be called.
          getTagMediaCount: function(parallelCallback){
            console.log("@gramroutes.getInitialData.getTagMediaCount - for:", tagName);
            instalib.getTagMediaCount(tagName,function(mediaCount){
              tag.data.tagMediaCount = mediaCount;
              parallelCallback();
            });
          },
          getImageInfo: function(parallelCallback){
            //get data about image
            console.log("@gramroutes.getInitialData.getImageInfo - for:", tagName);
            async.series({ // the async.series functions object. Contains the function to be called.
              getImageUrl: function(seriesCallback){
                console.log("@gramroutes.getInitialData.getImageUrl - for:", tagName);
                instalib.getRecentImageUrl(tagName,function(imageUrl){
                  tag.recentImage.imageUrl = imageUrl;
                  seriesCallback();
                });
              },
              getImageDominantColor: function(seriesCallback){
                console.log("@gramroutes.getInitialData.getImageDominantColor - for:", tagName);
                colorlib.getImageDominantColor(tag.recentImage.imageUrl,function(imageDominantColor){
                  tag.recentImage.imageDominantColor = imageDominantColor;
                  seriesCallback();
                });
              },
              setTagDominantColor: function(seriesCallback){
                console.log("@gramroutes.getInitialData.setTagDominantColor - for:", tagName);
                tag.data.tagDominantColor = tag.recentImage.imageDominantColor;
                seriesCallback();
              }
            }, //--end async.series functions object
            function(err, results){ // this is the 'seriesCallback' which is called after all function are complete.
              // results is an object of the results from each of the functions.
              if(err){
                console.log("@gramroutes.getInitialData.seriesCallback.err - error:",err);
              };
              parallelCallback();
            }) //--end async.series
          },
          subscribeTag: function(parallelCallback){
            console.log("@gramroutes.getInitialData.subscribeTag - for:",tagName);
            if(typeof tags[tagName].subscriptionId === 'undefined'){
              instalib.subscribeTag(tagName,function(subscribedTag,subscriptionId){ //TODO: handle error
                console.log("@gramroutes.getInitialData.subscribeTag - subscription details for:",tagName, " are:",subscribedTag, " and" ,subscriptionId);
                tags[tagName].subscriptionId = subscriptionId;
                parallelCallback();
              });
            }
            else {
              console.log("@gramroutes.getInitialData.subscribeTag - already subscribed to tag:",tagName);
              parallelCallback();
            };
          }
        }, //--end async.parallel functions object
          function(err, results){ // this is the 'parallelCallback' which is called after all function are complete.
            // results is an object of the results from each of the functions.
            if(err){
              console.log("@gramroutes.getInitialData.parallelCallback.err - error:",err);
            };
            eachCallback();
        }) //--end async.parallel
      }, //--end async.each iterator
      function(err){ //this is the 'eachCallback' which is called after all of the array members were processed
        if(err){
          console.log("@gramroutes.getInitialData.eachCallback.err - error:",err);
        };
        console.log("@gramroutes.getInitialData - sending tagsInfo:", tagsInfo)
        res.send(tagsInfo); 
        initialDataSent = true;
        // console.log("@gramroutes.getInitialData - the tags array is:", tags)
      }) //--end async.each
  },
  handshakeSubscription: function(req,res){
    console.log("@gramroutes.handshakeSubscription");
    instalib.handshake(req,res,function(data){
      console.log("@gramroutes.handshakeSubscription - verify token is:", data);
    });
  },
  gotSubscription: function(req,res){
    //dummy tags[]
    // tag1 = new Tag("mister");
    // tag1.subscriptionId = 3107285;
    // tag2 = new Tag('hours');
    // tag2.subscriptionId = 3107467;
    // tags = {'mister' : tag1, 'hours': tag2};
    //end dummy tags[]
    res.send(200);
    console.log("@gramroutes.gotSubscription",req.body);
    var updatedTags = req.body;
    if (!initialDataSent){
      console.log("@gramroutes.gotSubscription - initial data wasn't sent yet")
      //TODO: exit
    }
    var tagsInfo = [];
    async.each( //do work on each subscription that was updated
      updatedTags,
      function(updatedTag,eachCallback){ // the async.each iterator
        var tagName = updatedTag.object_id;
        var updateTime = updatedTag.time;
        var subscriptionId = updatedTag.subscription_id;
        console.log("@gramroutes.gotSubscription - for:", tagName);
        if(tags[tagName] && tags[tagName].subscriptionId == subscriptionId){
          tag = tags[tagName];
        }
        else {
          console.log("@gramroutes.gotSubscription - That's weird. \"%s\" with subscription ID:%d is not listed the tags list",tagName,subscriptionId);
          // eachCallback("subscription update for unlisted tag");
          //TODO: stop operation;
        }
        tagsInfo.push(tag);
        async.parallel({ // the async.parallel functions object. Contains the function to be called.
          getTagMediaCount: function(parallelCallback){
            console.log("@gramroutes.gotSubscription.getTagMediaCount - for: %s",tagName);
            instalib.getTagMediaCount(tagName,function(mediaCount){
              console.log("@gramroutes.gotSubscription.getTagMediaCount - for: %s is %d",tagName,mediaCount);
              tag.data.tagMediaCount = mediaCount;
              console.log("@gramroutes.gotSubscription.getTagMediaCount - but tagMediaCount is:",tag.data.tagMediaCount);
              parallelCallback();
            });
          },
          getImageInfo: function(parallelCallback){
            //get data about image
            console.log("@gramroutes.gotSubscription.getImageInfo - for:", tagName);
            async.series({ // the async.series functions object. Contains the functions to be called.
              getImageUrl: function(seriesCallback){
                console.log("@gramroutes.gotSubscription.getImageUrl - for:", tagName);
                instalib.getRecentImageUrl(tagName,function(imageUrl){ //relate to time? or max_id?
                  tag.recentImage.imageUrl = imageUrl;
                  seriesCallback();
                });
              },
              getImageDominantColor: function(seriesCallback){
                console.log("@gramroutes.gotSubscription.getImageDominantColor - for:", tagName);
                colorlib.getImageDominantColor(tag.recentImage.imageUrl,function(imageDominantColor){
                  tag.recentImage.imageDominantColor = imageDominantColor;
                  seriesCallback();
                });
              },
              getTagDominantColor: function(seriesCallback){
                console.log("@gramroutes.gotSubscription.getTagDominantColor - for:", tagName);
                colorlib.getTagDominantColor(tagName,function(tagDominantColor){
                  tag.data.tagDominantColor = tagDominantColor;
                  seriesCallback();
                });
              }
            }, //--end async.series functions object
            function(err, results){ // this is the 'seriesCallback' which is called after all function are complete.
              // results is an object of the results from each of the functions.
              if(err){
                console.log("@gramroutes.gotSubscription.seriesCallback.err - error:",err);
              };
              parallelCallback();
            }) //--end async.series
          },
        }, //--end async.parallel functions object
          function(err, results){ // this is the 'parallelCallback' which is called after all function are complete.
            // results is an object of the results from each of the functions.
            if(err){
              console.log("@gramroutes.gotSubscription.parallelCallback.err - error:",err);
            };
            eachCallback();
        }) //--end async.parallel
      }, //--end async.each iterator
      function(err){ //this is the 'eachCallback' which is called after all of the array members were processed
        if(err){
          console.log("@gramroutes.gotSubscription.eachCallback.err - error:",err);
        };
        console.log("@gramroutes.gotSubscription - sending tagsInfo:", tagsInfo)
        // res.send(tagsInfo); 
        // console.log("@gramroutes.getInitialData - the tags array is:", tags)
      }) //--end async.each

/*    var tagNames = [];
    for (var i = 0; i < updatedTags.length; i++) {
      tagNames[i] = updatedTags[i].object_id
    };
    // socket1.emit('debugging', tagNames)
    console.log("@gramroutes.gotSubscription - updated tags:",tagNames);*/
  },
  unsubscribeAll: function(){
    console.log("@gramroutes.unsubscribeAll");
    instalib.unsubscribeAll(function(data){
      if (data != null) {
        console.log("@gramroutes.unsubscribeAll - error:", data)
      }
    });
  },
  getPoster : function(req, res){
    res.render('poster', { title: 'Seminargram' });
  },
};