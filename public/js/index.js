var socket = io.connect();
// var socket = io.connect('http://seminargram.jit.su');

var ImageModel = Backbone.Model.extend({
  defaults: {
    imageUrl: "",
    tagName: "",
  }
});

var ImagesCollection = Backbone.Collection.extend({
  model: ImageModel
});

var ImageView = Backbone.View.extend({
  tagName: 'img',
  className: 'tagImage',
  render: function(){
    var template = _.template("<img src='<%=imageUrl%>'' alt='<%=tagName%>' title='<%=tagName%>'>"); //the tagName already creates an img. what should I do?
  }
});

var TagModel = Backbone.Model.extend({});

var TagsCollection = Backbone.Collection.extend({
  model: TagModel
});



/*var TagModel = Backbone.Model.extend({
  defaults: {
    tagName: "",
    images: new ImagesCollection,
    data: {
      tagDominantColor: [0,0,0],
      tagMediaCount : 0    
    }
  },
  initialize: function(){
    this.on('change:images',function(){
      //do something when the images change.
    })
  }
});*/

var TagView = Backbone.View.extend({
  className: 'tagContainer', // optional, you can assign multiple classes to this property  should have the tagName as a class
  id: '', // optional
  render: function(){
    var template = _.template("");
  }
});

var deleteButton = '<span id="delete">X</span>'
var searchLoader = "<div class='loader' id='searchLoader'></div>"

// Handle socket events
socket.on('connection', function(data){
  if(data == 'connected'){
    console.log("connection:", data);
  }
  else{
    console.log("something wrong with the socket.io connection");
  };
});
socket.on('debug', function (data) {
  console.log(data);
});

//send data to server
$(document).ready(function () {
  // if text input field value is not empty show the "X" button
  $("#searchbox").keyup(function() {
    if ($.trim($("#searchbox").val()) !== "") {
      $("#delete").fadeIn();
    }
    else {
      $("#delete").fadeOut();
    }
  });

  $("#delete").click(function() {
    $("#searchbox").val("");
    $(this).hide();
  });

  $("#submitButton").click(function () {
    // empty current images
    $("#result").empty();
    var queryString = $("#searchbox").val().trim();
    if (queryString !== ""){
      var query = queryString.split(" ");
      console.log("sending query",query);
      //start loader animation
      $("#delete").replaceWith(searchLoader);
      // create the tagsCollection
      tags = new TagsCollection;
      //get Initial data from server
      socket.emit('init', query);
    }
  })
});



// get data from server
socket.on('newData', function(data){
  console.log("newData recieved",data);
  tags.add(data);

  // handle search box graphics
  $("#searchLoader").replaceWith(deleteButton);
  $("#delete").click(function() {
    $("#searchbox").val("");
    $(this).hide();
  });
})


/*tags.on("add",function(tag){
  //do something when a tag is added
})
tags.on('change',function(tag){
  //do somehitng when a tagModel is changed. can also listen to a specific propertey that is changed - 'change:data'
})*/




