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

//connection stages
socket.on('connect', function () {
    console.log("socket.io - socket connected successfully");
});
socket.on('connecting', function () {
    console.log("socket.io - socket is attempting to connect with the server");
});
socket.on('disconnect', function () {
    console.log("socket.io - socket disconnected");
});
socket.on('connect_failed', function () {
    console.log("socket.io - failed to establish a connection to the server and has no more transports to fallback to");
});
socket.on('error', function () {
    console.log("socket.io - an error occured and it cannot be handled by the other event types");
});
socket.on('reconnect_failed', function () {
    console.log("socket.io - failed to re-establish a working connection after the connection was dropped");
});
socket.on('reconnect', function () {
    console.log("socket.io - successfully reconnected to the server");
});
socket.on('reconnecting', function () {
    console.log("socket.io - attempting to reconnect with the server");
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
        $("#result").children().empty();
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


function newTag (tagName) {
    var tagContainerElement = $("<div class='"+tagName+" tagContainer'>");
    tagContainerElement.width(imageSideLength);

    var tagTitleElement = $("<div class='"+tagName+" tagTitle'>"+tagName+"</div>");
    tagTitleElement.width(imageSideLength);
    $("#resultTitles").append(tagTitleElement);
    var tagImagesElement = $("<div class='"+tagName+" tagImages'>");
    tagImagesElement.width(imageSideLength);
    // $("#result").append(tagContainerElement);
    // $(tagContainerElement).append(tagTitleElement);

    $("#resultImages").append(tagImagesElement);
    // $(tagContainerElement).append(tagImagesElement);
    tagImages = tags.get(tagName).get("images");
    prependImages(tagName, tagImages);
}

function calculateSideLength (tagsCount) {
    var searchDivHeight = $("#searchForm").outerHeight(true);
    var titleDivHeight = $("#title").outerHeight(true);
    var resultTitlesDivHeight = $("#resultTitles").outerHeight(true);
    var otherDivHeight = searchDivHeight + titleDivHeight + resultTitlesDivHeight;
    var windowHeight = $(window).height();
    var maxResultHeight = windowHeight - otherDivHeight;

    var wrapperWidth = $("#maincontainer").width();

    var maxWidth = Math.floor(wrapperWidth / tagsCount);
    var maxHeight = Math.floor((maxResultHeight / maxImages)*0.9);

    return maxWidth < maxHeight ? maxWidth : maxHeight
}

function prependImages (tagName, tagImages) {
    for (var i = 0; i < tagImages.length; i++) {
        tagImages[i]
        var imgElement =$("<img src='"+tagImages[i]+"' alt='"+tagName+"' title='"+tagName+"'>")
        imgElement.width(imageSideLength);
        var parentElement = $(".tagImages."+tagName);
        $(parentElement).prepend(imgElement);
    };
}

function updateTag (data) {
    var tagName = data.tagName;
    var tagNewImage = data.images;
    console.log("@updateTag for", tagName);
    prependImages(tagName, tagNewImage);
}

// get data from server
socket.on('newData', function(data){
    // in case only 1 object is returned, it does not have a "length" property, therefor we wrap it in an array
    if (typeof data.length == "undefined") {
        var _data = data;
        var data = [_data];
    }
    console.log("@newData recieved",data);
    if (tags.length == 0) { // if this is all initial data
        // set global image side's length
        window.imageSideLength = calculateSideLength(data.length);

        // handle search box graphics
        $("#searchbox").val("");
        $("#searchLoader").replaceWith(deleteButton);
        $("#delete").click(function() {
            $("#searchbox").val("");
            $(this).hide();
        });     
    }
    for (var i = 0; i < data.length; i++) {
        var tagName = data[i].tagName;
        if (tags.get(tagName)) {
            console.log("@newData - existing tag", tagName);
            updateTag(data[i]);
            $(".tagImages."+tagName).find(".greyBKG").children().unwrap();
        }
        else {
            console.log("@newData - new tag", tagName);
            tags.add(data[i]);
            newTag(tagName);
        }        
    };
    imageSlider();
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
                if(!lastImg.parent().hasClass('greyBKG')){
                    lastImg.wrap("<div class='greyBKG' />");
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

