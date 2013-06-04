if (document.title.indexOf("local") == -1) {
    var socket = io.connect("https://sultag.it",{secure: true}); //production (remote) secure connetion
    var imageRefreshInterval = 5000; //slower images
}
else {
    var socket = io.connect(); //localhost non secure connection
    var imageRefreshInterval = 1500; //faster images
}
var maxImages = 3;
var maxTags = 6;
var illegalCharactersInHashtags = /[^\w]/;
var illegalCharactersInSentence = /[^\w\s]/;
// gloval variable to hold instagram errors that should be handled
var InstagramError_APINotAllowed = "APINotAllowedError"

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

// server connected
socket.on('connection', function (data) {
    if (data == 'connected') {
        removeLoader($("html"));
        console.log("connection:", data);
    }
    else {
        console.log("something wrong with the socket.io connection");
    };
});

socket.on('debug', function (data) {
    console.log("message from server:", data);
})

//server connection status
// connection lost temporarily
socket.on('connecting', function () {
    console.log("connection lost - connecting");
    displayLoader($("html"), "Connection lost - trying to reconnect", true);
});
socket.on('disconnect', function () {
    console.log("connection lost - disconnect");
    displayLoader($("html"), "Connection lost - trying to reconnect", true);
});
//connection lost permenantly
socket.on('connect_failed', function () {
    console.log("connection lost - connect_failed");
    displayLoader($("html"), "Failed to connect - please restart the app", true);
});
socket.on('error', function () {
    console.log("connection lost - error");
    displayLoader($("html"), "Failed to connect - please restart the app", true);
});
socket.on('reconnect_failed', function () {
    console.log("connection lost - reconnect_failed");
    displayLoader($("html"), "Failed to connect - please restart the app", true);
});
socket.on('reconnecting', function () {
    console.log("connection lost - reconnecting");
    displayLoader($("html"), "Failed to connect - please restart the app", true);
});
//connection back on
socket.on('reconnect', function () {
    console.log("connection found - reconnect");
    removeLoader($("html"));
});


$(document).ready(function () {
    //start connecting to server animation
    displayLoader($("html"), "Please Wait - Connecting to server", true);

    //bind 'enter' keystroke to the submit button click handler
    $('#searchbox').keypress(function(e){
            if(e.which == 13){//Enter key pressed
                    $('#submitButton').click();//Trigger search button click event
                    $(this).blur();
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
        }
    })

    $('#searchbox').keyup(function (e) {
        if (e.which !== 13) { //return key
            var str = $("#searchbox").val().trim();
            if (e.which == 32) { //spacebar key
                var wordsCount = str.split(illegalCharactersInHashtags).length;
                if (wordsCount >= maxTags) {
                    displaySearchMessage("maximum "+maxTags+" words allowed");
                    $("#searchbox").val(str);
                }
            }
            if (str.match(illegalCharactersInSentence)) {
                displaySearchMessage("only english letters and numbers please");
                $("#searchbox").val(str.slice(0, - 1));
            }
        }
    })

    $("#logo").click(function(){
        $("#secretControls").toggle();
    })

    $("#infoButtonWrapper").click(function () {
        displayInfo();
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
    var tags = queryString.split(illegalCharactersInHashtags);
    //only 6 tags are allowed
    if (tags.length > maxTags) {
        tags.length = maxTags;
    }
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
    // console.log("@destroyPreviousQuery");
    if (typeof tagsCollection !== "undefined" && tagsCollection.length !== 0) {
        //get all inervalID from all tags and stop intervals (intervalID)
        var intervals = tagsCollection.pluck("intervalID");
        for (var i = 0; i < intervals.length; i++) {
            clearInterval(intervals[i]);
        };
        // stop server subscriptions
        var tagNames = tagsCollection.pluck("tagName");
        socket.emit('subscriptions',{handle: "unsubscribe", tags: tagNames});
        // destroy previous models
        tagsCollection.reset();
    }
    // empty current images
    $("#result").children().empty();
    callback();
}

function makeTagElemnts (tags) {
    for (var i = 0; i < tags.length; i++) {
        var tagName = tags[i];
        //create elements for the tag's title
        var tagTitleElement = $("<div class='"+tagName+" tagTitle'>"+tagName+"</div>");
        $("#resultTitles").append(tagTitleElement);
        //create elements for the tag's images
        var tagImagesElement = $("<div class='"+tagName+" tagImages'>");
        $("#resultImages").append(tagImagesElement);
    };
    displayLoader($(".tagImages"), "", false);
}

function prependImages (tagName, tagImages) {
    var parentElement = $(".tagImages."+tagName);
    if (typeof tagImages == "object") {
        for (var i = (tagImages.length - 1); i >= 0 ; i--) {
            var imgElement =$("<img src='"+tagImages[i]+"' alt='"+tagName+"' title='"+tagName+"'>")
            imgElement.height(0);
            $(parentElement).prepend(imgElement);
        };
    }
    else {
        var imgErrorMessage = "error getting images";
        var tagTitleElement = $(".tagTitle."+tagName);
        if (tagImages == InstagramError_APINotAllowed) {
            imgErrorMessage = "this tag is forbidden"
        };
        var errElement = $("<div class='imgError "+tagName+"'>"+imgErrorMessage+"</div>");    
        $(parentElement).prepend(errElement);
        tagTitleElement.addClass("erroredTagTitle");
    };
}

function newTag (data) {
    tagsCollection.add(data,{merge: true});
    var tagName = data.tagName;
    var tagImages = data.images;
    removeLoader($(".tagImages."+tagName));
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
    }
    for (var i = 0; i < data.length; i++) {
        var tagName = data[i].tagName;
        if (tagsCollection.get(tagName)) {
            // console.log("@newData - existing tag", tagName);
            updateTag(data[i]);
        }
        else {
            // console.log("@newData - new tag", tagName);
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
    var h = img.parent().width();
    TweenLite.fromTo(img, speed, {top: startFromDistance, autoAlpha: 0}, {top: 0, autoAlpha: 1, height: h, display: "block"});
};

function displayLoader (parentElement, message, overlay) {
    if (parentElement.find(".loaderWrapper").length !== 0) {
        return;
    }
    var loaderWrapper = $("<div class='loaderWrapper'>" +
                            "<div class='loaderContent'>" +
                                "<div class='loaderMessage'>"+message+"</div>" +
                                "<div class='circularGWrapper'>" +
                                    "<div id='circularG_1' class='circularG'></div>" +
                                    "<div id='circularG_2' class='circularG'></div>" +
                                    "<div id='circularG_3' class='circularG'></div>" +
                                    "<div id='circularG_4' class='circularG'></div>" +
                                    "<div id='circularG_5' class='circularG'></div>" +
                                    "<div id='circularG_6' class='circularG'></div>" +
                                    "<div id='circularG_7' class='circularG'></div>" +
                                    "<div id='circularG_8' class='circularG'></div>" +
                                "</div>" +
                            "</div>" +
                        "</div>");
    loaderWrapper.width(parentElement.width());
    if (overlay) {
        loaderWrapper.addClass("loaderWrapperOverlay");
    }
    parentElement.prepend(loaderWrapper);
}

function removeLoader (parentElement) {
    parentElement.find(".loaderWrapper").remove();
}

function displaySearchMessage (msg) {
    var messagesElement = $("#messages");
    messagesElement.html(msg);
    TweenLite.to(messagesElement, 0.5, {autoAlpha: 1,
        onComplete: function() {
            TweenLite.to(messagesElement, 0.75, {autoAlpha: 0, delay:0.75});
        }
    });
}

function displayInfo () {
    var infoWrapper = $('<div id="infoWrapper">' +
                            '<div id="infoDialog">' +
                                '<h1 id="infoHeader">About Sultagit</h1>' +
                                 '<article id="infoData">The best project ever</article>' +
                                 '<footer id="infoFooter"><input type="button" id="closeInfo" value="Close Dialog"/></footer>' +
                            '</div>' +
                        '</div>')
    $('html').prepend(infoWrapper);
    $('#closeInfo').click(function () {closeInfo()});
}

function closeInfo () {
    var infoWrapper = $('html').find('#infoWrapper').remove();
    TweenLite.to(infoWrapper, 0.75, {autoAlpha: 0});
}