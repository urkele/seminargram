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

    //recalculate images container element's box-model accrding do screen proportions
    claculateImageContainer();

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

function claculateImageContainer () {
    var headerHeight = $("header").outerHeight(true);
    var searchWrapperHeight = $("#searchWrapper").outerHeight(true);
    var resultTitlesDivHeight = $("#resultTitles").outerHeight(true);
    var seperatorDivHeight = $("#seperator").outerHeight(true);
    var resultImagesDivWidth = $("#resultImages").width();

    var otherDivHeight = headerHeight + searchWrapperHeight + resultTitlesDivHeight + seperatorDivHeight;
    var resultImagesDivHeight = $(window).height() - otherDivHeight * 1.1; //multiply a little to compensate for bad report of elements dimentions

    //these percentage values should match the ones in the css file
    var currentWidthPct = 11.3;
    var currentMarginPct = 3.32;

    var currentWidthPx = (currentWidthPct / 100) * resultImagesDivWidth;
    var currentMarginRightPx = (currentMarginPct / 100) * resultImagesDivWidth;
    // var currentMarginBottom = (29.3 / 100);

    if ((currentWidthPx * maxImages + currentMarginRightPx * (maxImages - 1)) > resultImagesDivHeight) {
        //calc new values
        var marginToWidthRatio = currentMarginPct / currentWidthPct;
        var wPct = 1 / (maxImages + (maxImages - 1) * marginToWidthRatio);
        var mrPct = marginToWidthRatio * wPct;

        var wpx = wPct * resultImagesDivHeight;
        var mrpx = mrPct * resultImagesDivHeight;

        var newWidthPrct = (wpx / resultImagesDivWidth) * 100;
        var newMarginRightPrct = (mrpx / resultImagesDivWidth) * 100;

        //create style element
        var tagImagesStyleElement = $('<style type="text/css">' +
                                            '#maincontainer #result #resultTitles .tagTitle {width: '+newWidthPrct+'%; margin-right: '+newMarginRightPrct+'%;}' +
                                            '#maincontainer #result .tagImages {width: '+newWidthPrct+'%; margin-right: '+newMarginRightPrct+'%;}' +
                                        '</style>')
        $('head').append(tagImagesStyleElement);
    }
}

// query handling

function startNewQuery (queryString) {
    queryString = queryString.toLowerCase();
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

//manipulate DOM for images

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

// images animation

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
    // console.log("imageSlider for '%s' - visible images - %d; queue - ", tagName, visibleImgs.length, imagesLeftInQueue);

    //only 1 image left
    if (visibleImgs.length == 1 && !imagesLeftInQueue) {
        var lastVisibleImgOpc = lastVisibleImg.css("opacity")
        if(lastVisibleImgOpc >= 0.1){
            TweenLite.to(lastVisibleImg, animationSpeed, {opacity: lastVisibleImgOpc - 0.1})
        }
    }
    //working the way up to total images displayed or down to 1
    else if (visibleImgs.length < maxImages) {
        if (!imagesLeftInQueue) {
            // console.log("@imageSlider for '%s'- going down from %d to 1", tagName, maxImages);
            TweenLite.to(lastVisibleImg, animationSpeed, {top: "+=100", autoAlpha: 0,
                onComplete: function () {
                    lastVisibleImg.remove();
                }
            });
        }
        else {
            // console.log("@imageSlider for '%s'- going up from %d to %d", tagName, visibleImgs.length, maxImages);
            slideInNewImg(lastHiddenImg, animationSpeed)
        }
    }
    //all images displayed - kick out the last one and bring in a new one
    else {
        // console.log("@imageSlider for '%s'- all %d images are on. meaning there are %d images visible", tagName, maxImages, visibleImgs.length);
        TweenLite.to(lastVisibleImg, animationSpeed, {top: "+=100", autoAlpha: 0,
            onComplete: function () {
                lastVisibleImg.remove();
            },
            onStart: slideInNewImg(lastHiddenImg, animationSpeed)
        });

    };
};

function slideInNewImg (img, speed) {
    var startFromDistance = -50;
    var imgFinalHeight = img.parent().width();
    TweenLite.fromTo(img, speed, {top: startFromDistance, autoAlpha: 0}, {top: 0, autoAlpha: 1, height: imgFinalHeight, display: "block"});
};

//loader animation

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

// search error messages

function displaySearchMessage (msg) {
    var messagesElement = $("#messages");
    messagesElement.html(msg);
    TweenLite.to(messagesElement, 0.5, {autoAlpha: 1,
        onComplete: function() {
            TweenLite.to(messagesElement, 0.75, {autoAlpha: 0, delay:0.75});
        }
    });
}

//info dialog

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