var socket = io.connect('http://localhost:3000/');

var ImageModel = Backbone.Model.extend({
  defaults: {
    imageUrl: "",
  }
});

var ImagesCollection = Backbone.Collection.extend({
  model: ImageModel
});

var ImageView = Backbone.View.extend({
  el: 'img'
});

var TagModel = Backbone.Model.extend({
  defaults: {
    tagName: "",
    images: new ImagesCollection,
    data: {
      tagDominantColor: [0,0,0],
      tagMediaCount : 0    
    }
  }
});

var TagsCollection = Backbone.Collection.extend({
  model: TagModel
});

var TagView = Backbone.View.extend({
  el: 'div'
});


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
socket.on('newData', function(data){
  console.log("newData recieved",data);
  $(".loader").toggle();
})


//send data to server
$(document).ready(function () {
  $("#submit").click(function () {
    $("#tagsCanvas").empty(); // erease images
    var queryString = $("#searchbox").val().trim();
    if (queryString !== ""){
      var query = queryString.split(" ");
      console.log("sending query",query);
      //create a new TagModel for each tag?
      $(".loader").toggle();
      //get Initial data from server
      socket.emit('init', query);
    }
  })
});