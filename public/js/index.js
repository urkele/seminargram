// var socket = io.connect("https://sultag.it",{secure: true}); //production connetion
var socket = io.connect(); //localhost connection
var maxImages = 4;
var imageRefreshInterval = 5000;

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
  el: 'img',
  className: 'tagImage',
  render: function(){
    var template = _.template("<img src='<%=imageUrl%>'' alt='<%=tagName%>' title='<%=tagName%>'>"); //the tagName already creates an img. what should I do?
  }
});

var TagModel = Backbone.Model.extend({
  idAttribute: "tagName"
});

var TagsCollection = Backbone.Collection.extend({
  model: TagModel
});


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


  //bind 'enter' keystroke to the submit button click handler
  $('#searchbox').keypress(function(e){
      if(e.which == 13){//Enter key pressed
          $('#submitButton').click();//Trigger search button click event
      }
  });
  $('#submitButton').keypress(function(e){
      if(e.which == 13){//Enter key pressed
          $('#submitButton').click();//Trigger search button click event
      }
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

      //register events in collection
      tags.on("add",function(tag){
        console.log("something added to tags collection:", tag);
      })
      tags.on('change',function(tag){
        //do somehitng when a tagModel is changed. can also listen to a specific propertey that is changed - 'change:data'
        console.log("something changed in tags collection:", tag);
      })

      //get Initial data from server
      socket.emit('init', query);
    }
  })

  $("#title").click(function(){
    $("#secretControls").toggle();
  })

  $("#speedSelector").change(function(){
    imageRefreshInterval = $(this).val()*1000;
    $(this).next('span').html(imageRefreshInterval/1000);
  });
  $("#stopSubscriptions").click(function(){
    console.log("sendstop");
    socket.emit('subscriptions',{handle: "stop"});
  });
});


  

// get data from server
socket.on('newData', function(data){
  console.log("newData recieved",data);
  tags.add(data,{merge: true});
  for (var i = 0; i < data.length; i++) {
    var tagName = data[i].tagName;
    var tagImages = data[i].images;
    var tagData = data[i].data;
    var wrapperWidth = $("#maincontainer").width();
    var tagContainerWidth = Math.floor(wrapperWidth / data.length);
    // console.log("there are %d images and the top width is %d therefor each el width is %d",data.length,wrapperWidth,tagContainerWidth);

    var tagContainerElement = $("<div class='"+tagName+" tagContainer'>");
    tagContainerElement.width(tagContainerWidth);
    var tagTitleElement = $("<div class='"+tagName+" tagTitle'>"+tagName+"</div>");
    var tagImagesElement = $("<div class='"+tagName+" tagImages'>")
    $("#searchbox").val("");
    $("#result").append(tagContainerElement);
    $(tagContainerElement).append(tagTitleElement);
    $(tagContainerElement).append(tagImagesElement);

    for (var j = 0; j < tagImages.length; j++) {
      tagImages[j]
      var imgElement =$("<img src='"+tagImages[j]+"' alt='"+tagName+"' title='"+tagName+"'>")
      imgElement.width(tagContainerWidth);
      $(tagImagesElement).prepend(imgElement);
    };
  };
  var wrapperWidth = $("#result").width();
  var tagContainerWidth = Math.floor(wrapperWidth / data.length);
  imageSlider();


  // handle search box graphics
  $("#searchLoader").replaceWith(deleteButton);
  $("#delete").click(function() {
    $("#searchbox").val("");
    $(this).hide();
  });
})

function imageSlider(){
  $(".tagImages").each(function(){
    var _this = this
    // console.log("the set width of each el is %d",$(this).width());
    setInterval(function(){
      var displayedImagesNum = $(_this).find("img:visible").length
      var imagesLeftInQueue = $(_this).find("img:hidden").length;
      // console.log("there are %d images displayed",displayedImagesNum);

      //only 1 image
      if(displayedImagesNum == 1 && !imagesLeftInQueue){
        var lastImg = $(_this).find("img:visible")
        if(!lastImg.parent().hasClass('geryBKG')){
          lastImg.wrap("<div class='geryBKG' />");
          lastImg.parent().width(lastImg.width());
          lastImg.parent().height(lastImg.height());
          // console.log("img width is %d and parnent width is %d",lastImg.width(),lastImg.parent().width());
        }
        var lastImgOpc = lastImg.css("opacity")
        if(lastImgOpc >= 0.1){
          lastImg.fadeTo('slow', (lastImgOpc-0.1));
        }
      }


      else if(displayedImagesNum < maxImages){
        if(!imagesLeftInQueue){
          $(_this).find("img:visible").last().fadeOut("slow",function(){
            $(this).remove();
          });
        }
        else {
          $(_this).find("img:hidden").last().slideDown("slow");
        }
      }

      else{
        $(_this).find("img:visible").last().fadeOut("slow",function(){
          $(this).remove();
          $(_this).find("img:hidden").last().slideDown("slow");
        });
      };
    },imageRefreshInterval);
  })
}

