
if (document.title.indexOf("local") == -1) {
    var socket = io.connect("https://sultag.it",{secure: true}); //production (remote) secure connetion
    var imageRefreshInterval = 5000; //slower images
}
else {
    var socket = io.connect(); //localhost non secure connection
    var imageRefreshInterval = 1500; //faster images
}
var maxImages = 3;

//backbone models and collections
var TagModel = Backbone.Model.extend({
    idAttribute: "tagName",
    defaults: {
        "intervalID":  ""
    }
});

var TagsCollection = Backbone.Collection.extend({
    model: TagModel
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
        var queryString = $("#searchbox").val().trim();
        if (queryString !== ""){
            destroyPreviousQuery(function () {
                startNewQuery(queryString);
            });
            //start loader animation
            $("#delete").replaceWith(searchLoader);
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

function startNewQuery (queryString) {
    var tags = queryString.split(" ");
    console.log("@startNewQuery - sending query",tags);
    // create the tagsCollection if it doesn't exist
    if (typeof tagsCollection == "undefined" || !tagsCollection) {
        tagsCollection = new TagsCollection;
    }
    //register events in collection
    /*tagsCollection.on("add",function(tag){
        // console.log("something added to tagsCollection collection:", tag);
    })
    tagsCollection.on('change',function(tag){
        //do somehitng when a tagModel is changed. can also listen to a specific propertey that is changed - 'change:data'
        // console.log("something changed in tagsCollection collection:", tag);
    })*/
    //get Initial data from server
    socket.emit('init', tags);
    makeTagElemnts(tags);
}

function destroyPreviousQuery (callback) {
    console.log("@destroyPreviousQuery");
    if (typeof tagsCollection !== "undefined" && tagsCollection.length !== 0) {
        //get all inervalID from all tags and stop intervals (intervalID)
        var intervals = tagsCollection.pluck("intervalID");
        for (var i = 0; i < intervals.length; i++) {
            clearInterval(intervals[i]);
        };
        // destroy previous models
        tagsCollection.reset();
    }
    // empty current images
    $("#result").children().empty();
    callback();
}

function makeTagElemnts (tags) {
    window.imageSideLength = calculateSideLength(tags.length);
    var tagTitleStyleElement = $("<style type='text/css'> .tagTitle{width: "+imageSideLength+"px} </style>");
    var tagImagesStyleElement = $("<style type='text/css'> .tagImages{width: "+imageSideLength+"px} </style>");
    $("head").append(tagTitleStyleElement, tagImagesStyleElement);
    
    for (var i = 0; i < tags.length; i++) {
        var tagName = tags[i];
        //create elements for the tag's title
        var tagTitleElement = $("<div class='"+tagName+" tagTitle'>"+tagName+"</div>");
        $("#resultTitles").append(tagTitleElement);
        //create elements for the tag's images
        var tagImagesElement = $("<div class='"+tagName+" tagImages'>");
        $("#resultImages").append(tagImagesElement);
    };
}

function calculateSideLength (tagsCount) {
    // The margin/padding/border as set in the css/less file, should be taken into account.
    var margin = 0;
    var padding = 0;
    var border = 0;

    var searchDivHeight = $("#searchForm").outerHeight(true);
    var titleDivHeight = $("#title").outerHeight(true);
    var resultTitlesDivHeight = $("#resultTitles").outerHeight(true);
    var otherDivHeight = searchDivHeight + titleDivHeight + resultTitlesDivHeight;
    var windowHeight = $(window).height();
    var maxResultHeight = windowHeight - otherDivHeight;

    var wrapperWidth = $("#maincontainer").width();

    var maxWidth = Math.floor(wrapperWidth / tagsCount);
    var maxHeight = Math.floor((maxResultHeight / maxImages)*0.9);

    var sideLength = maxWidth < maxHeight ? maxWidth : maxHeight;

    // currently there is a 0.5% margin from both sides. the percentage is off the wrapper's width
    margin = wrapperWidth * 0.005 *2
    var extraLength = margin+padding+border;

    return Math.floor(sideLength - extraLength);
}

function prependImages (tagName, tagImages) {
    var parentElement = $(".tagImages."+tagName);
    for (var i = 0; i < tagImages.length; i++) {
        tagImages[i]
        var imgElement =$("<img src='"+tagImages[i]+"' alt='"+tagName+"' title='"+tagName+"'>")
        imgElement.height(0);
        $(parentElement).prepend(imgElement);
    };
}

function newTag (data) {
    tagsCollection.add(data,{merge: true});
    var tagName = data.tagName;
    var tagImages = data.images;
    prependImages(tagName, tagImages);
    var intervalID = setInterval(function () {imageSlider(tagName)},imageRefreshInterval);
    tagsCollection.get(tagName).set({intervalID: intervalID});
}

function updateTag (data) {
    var tagName = data.tagName;
    var tagNewImage = data.images;
    // console.log("@updateTag for", tagName);
    prependImages(tagName, tagNewImage);
}

// recived data from server
socket.on('newData', function(data) {
    // in case only 1 object is returned, it does not have a "length" property, therefor we wrap it in an array
    if (typeof data.length == "undefined") {
        var _data = data;
        var data = [_data];
    }
    console.log("@newData recieved",data);
    if (tagsCollection.length == 0) { // if this is all initial data
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
        if (tagsCollection.get(tagName)) {
            console.log("@newData - existing tag", tagName);
            updateTag(data[i]);
        }
        else {
            console.log("@newData - new tag", tagName);
            newTag(data[i]);
        }
    };
})

function imageSlider (tagName) {
    var tagImagesElement = $(".tagImages."+tagName);
    var imgBrutoSideLength = $(tagImagesElement).find("img").outerWidth();
    // console.log("imgBrutoSideLength:",imgBrutoSideLength);
    var animationSpeed = imageRefreshInterval > 1000 ? 1 : imageRefreshInterval / 1000 * 0.50;
    var visibleImgs = $(tagImagesElement).find("img:visible");
    var hiddenImages = $(tagImagesElement).find("img:hidden");
    var imagesLeftInQueue = hiddenImages.length;
    var lastHiddenImg = hiddenImages.last();
    var lastVisibleImg = visibleImgs.last();
    // console.log("imageSlider - visible images - %d; queue - ", visibleImgs.length, imagesLeftInQueue);

    //only 1 image left
    if (visibleImgs.length == 1 && !imagesLeftInQueue) {
        var lastVisibleImgOpc = lastVisibleImg.css("opacity")
        if(lastVisibleImgOpc >= 0.1){
            TweenLite.to(lastVisibleImg, animationSpeed, {opacity: lastVisibleImgOpc - 0.1})
        }
    }
    //working the way up to total images displayed
    else if (visibleImgs.length < maxImages) {
        if (!imagesLeftInQueue) {
            // console.log("@imageSlider - going down from %d to 1", maxImages);
            TweenLite.to(lastVisibleImg, animationSpeed, {top: "+=100", autoAlpha: 0,
                onComplete: function () {
                    $(lastVisibleImg).remove();
                }
            });
        }
        else {
            // console.log("@imageSlider - going up from %d to %d", visibleImgs.length, maxImages);
            slideInNewImg(lastHiddenImg, animationSpeed, visibleImgs, imgBrutoSideLength)
        }
    }
    else {
        // console.log("@imageSlider - all %d images are on. meaning there are %d images visible", maxImages, visibleImgs.length);
        TweenLite.to(lastVisibleImg, animationSpeed, {top: "+=100", autoAlpha: 0,
            onComplete: function () {
                $(lastVisibleImg).remove();
            },
            onStart: slideInNewImg(lastHiddenImg, animationSpeed, visibleImgs, imgBrutoSideLength)
        });

    };
};

function slideInNewImg (img, speed, visibleImgs, slideDownDistance) {
    var startFromDistance = -50;
    TweenLite.fromTo(img, speed, {top: startFromDistance, autoAlpha: 0}, {top: 0, autoAlpha: 1, height: imageSideLength, display: "block"});
};