var Sultagit = {
    Models: {},
    Views: {},
    Collections: {}
}
$(function () {
    
    /**
    /* backbone models and collections
    **/
    
    // define the Image model
    Sultagit.Models.Image = Backbone.RelationalModel.extend({
        defaults: {
            'position': 0,
            'src': ""
        },

        initialize: function () {
            this.on('change:position', this.changeNext)
        },

        //this method changes the 'position' property of the model that is infront of this model in the collectio (ie this.index -1)
        changeNext: function () {
            if (this.get('position') > 0) { //ignore cases when position is '0' (ie model initialization)
                var thisIndex = this.collection.indexOf(this);
                var previousModel = this.collection.at(thisIndex - 1);

                if (previousModel) {
                    var prevPos = previousModel.get('position');
                    previousModel.set('position', (prevPos + 1));
                }
            }
        }
    });

    // define the Images collection
    Sultagit.Collections.Images = Backbone.Collection.extend({
        model: Sultagit.Models.Image
    });

    // define the Tag model
    Sultagit.Models.Tag = Backbone.RelationalModel.extend({
        relations: [{
            type: Backbone.HasMany,
            key: 'images',
            relatedModel: 'Sultagit.Models.Image',
            collectionType: 'Sultagit.Collections.Images',
            reverseRelation: {
                key: 'imageOf'
            }
        }],
        idAttribute: "tagName",
        urlRoot: '/getTagsDummy',

        initialize: function () {
            // populate the ‘Tag titles’ section with the array’s elements.
            this.set('titleView' , new Sultagit.Views.TagTitleView({'title': this.get('tagName')}));
            this.set('imagesView', new Sultagit.Views.TagImagesView({model: this}));
        }
    });

    // define the Tags collection
    Sultagit.Collections.Tags = Backbone.Collection.extend({
        model: Sultagit.Models.Tag
    });

    // define the Socket model
    Sultagit.Models.Socket = Backbone.RelationalModel.extend({
        defaults: {
            socket: {},
        },
        initialize: function () {
            this.createSocket();
            var s = this.get('socket');
            var thisModel = this;
            if (!s) {
                //TODO: throw error no socket.
            }
            s.on('connect', function () {
                thisModel.connectionConnected();
            });
            s.on('connecting', function () {
                thisModel.connectionConnecting();
            });
            s.on('disconnect', function () {
                thisModel.connectionDisconnected();
            });
            s.on('connect_failed', function () {
                thisModel.connectionFailed();
            });
            s.on('error', function () {
                thisModel.connectionFailed();
                //TODO: or maybe throw an exception
            });
            s.on('reconnect_failed', function () {
                thisModel.connectionFailed();
            });
            s.on('reconnect', function () {
                thisModel.connectionConnected();
            });
            s.on('reconnecting', function () {
                thisModel.connectionConnecting();
            });

        },
        createSocket: function () {
            this.set('socket', io.connect());
            // io.connect(,{'max reconnection attempts': 5, reconnection limit: 3000})
        },
        connectionConnected: function () {
            this.get('master').set('status', 'ready');
        },
        connectionConnecting: function () {
            this.get('master').set('status', 'Connecting...');
        },
        connectionDisconnected: function () {
            this.get('master').set('status', 'Disconnected');
        },
        connectionFailed: function () {
            this.get('master').set('status', 'Failed to connect');
        }
    });

    // define the App model
    Sultagit.Models.App = Backbone.RelationalModel.extend({

        // define the 'tags' property that hold the tags collection with a HasMany relation (ie one App model holds many Tag models in a collection called Tags)
        relations: [
        {
            type: Backbone.HasMany,
            key: 'tags',
            relatedModel: 'Sultagit.Models.Tag',
            collectionType: 'Sultagit.Collections.Tags',
            reverseRelation: {
                type: Backbone.HasOne,
                key: 'application'
            }
        },
        {
            type: Backbone.HasOne,
            key: 'socket',
            relatedModel: 'Sultagit.Models.Socket',
            reverseRelation: {
                type: Backbone.HasOne,
                key: 'master'
            }
        }],

        // define various app variables
        defaults: {
            'imageSwapInterval': 1500,
            'maxImages': 3,
            'maxTags': 6,
            'illegalHashtagChars': /[^\w]/,
            'illegalSentenceChars': /[^\w\s]/,
            'InstagramError_APINotAllowed': 'APINotAllowedError',
            'status': '',
            'resultDimensions': []
        },

        // init the App model
        initialize: function () {

            // create a socket.io connection if applicable. if not - avoid 'undefined' errors
            new Sultagit.Models.Socket({master: this});

            // set the Swap Interval of the app and the animation speed //TODO: do only when query is sent to server.
            this.setAppSpeeds();

            // bind to a change event of 'imageSwapInterval' in order to reset application speed values if changed
            this.on('change:imageSwapInterval', this.setAppSpeeds); //FIXME: on app init, setAppSpeeds is called twice

            // bind to change event of 'query' in order to trigger a new query sequence
            this.on('change:query', function () {this.queryCleanup(); this.startNewQuery()})

            // create the search form view
            this.searchFormView = new Sultagit.Views.SearchView({model: this})

            // create the loader view
            this.loaderView = new Sultagit.Views.LoaderView({model: this, displayOverlay: true, el: $('html')})

            //caculate the width of a result container and its right margin
            this.claculateImageContainer();

            // create the result styling view
            new Sultagit.Views.ResultStylingView({model:this});

        },

        // trigger a 'swap' event at a fixed interval
        
        setAppSpeeds: function () {

            var imageSwapInterval = this.get('imageSwapInterval');
            var intervalId = this.get('intervalId');

            // set the animation speed to fit the image's refresh rate
            this.set('animationSpeed', imageSwapInterval > 1000 ? 1 : imageSwapInterval / 1000 * 0.50);

            // clear any previous intervals that exist
            if (intervalId) {
                clearInterval(intervalId);
            };

            // set the interval function
            var thisModel = this;
            this.set('intervalId', setInterval(function () {
                thisModel.trigger('swap');
            }, this.get('imageSwapInterval')));
        },

        // a function that calculates the maximum width and right margin for a containar of a single result (ie a 'tag title' or a 'tag images' element)
        // this is done in order to make the images fit incase a screen with an aspect ration different than an iPad (3/4) is used.
        
        claculateImageContainer: function () {
            var maxImages = this.get('maxImages');

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

            if ((currentWidthPx * maxImages + currentMarginRightPx * (maxImages - 1)) > resultImagesDivHeight) {
                //calc new values
                var marginToWidthRatio = currentMarginPct / currentWidthPct;
                var wPct = 1 / (maxImages + (maxImages - 1) * marginToWidthRatio);
                var mrPct = marginToWidthRatio * wPct;

                var wpx = wPct * resultImagesDivHeight;
                var mrpx = mrPct * resultImagesDivHeight;

                this.set('resultDimensions', [(wpx / resultImagesDivWidth) * 100, (mrpx / resultImagesDivWidth) * 100]); // [the new Width in percentages, the new Margin-Right in percentages]
            }
        },

        queryCleanup: function () {
            // console.log("cleanning old query stuff");
            //Server requests should be canceled.
            //Displayed results (if any) should be cleared.
            //Intervals cleared.
            //Models and views destroyed.

        },

        startNewQuery: function () {
            _.each(this.get('query'),function (tag) {


                // instatiate the tagModel and add it to the 'tags' collection
                this.get('tags').add({tagName: tag});

                // fetch the tagModel's data from the server (instatiating the 'imageModel' and fetching its data on the way)
                this.get('tags').get(tag).fetch();
            }, this);
        }
    });

    /**
    /* backbone views
    **/

    // define a new result-container styling view
    Sultagit.Views.ResultStylingView = Backbone.View.extend({

        template: _.template('<style type="text/css">' +
                                '#maincontainer #result #resultTitles .tagTitle {width: <%= resultDimensions[0] %>%; margin-right: <%= resultDimensions[1] %>%;}' +
                                '#maincontainer #result .tagImages {width: <%= resultDimensions[0] %>%; margin-right: <%= resultDimensions[1] %>%;}' +
                            '</style>'),

        initialize: function () {
            this.model.on('change:resultDimensions', this.render());
        },

        render: function () {
            $('head').append(this.template(this.model.toJSON()));
        }

    });

    // define the Tag title view
    Sultagit.Views.TagTitleView = Backbone.View.extend({

        // el: $("#resultTitles"),
        className: function () {return 'tagTitle '+this.options.title},
        // tagName: 'li',

        initialize: function () {
            this.render();
        },

        render: function () {
            $("#resultTitles").append(this.el);
            this.$el.html(this.options.title);
        }

    });

    // define the Tag images view - the DOM element that hold all the images for a tag
    Sultagit.Views.TagImagesView = Backbone.View.extend({

        className: function () {return 'tagImages '+this.model.get('tagName')},

        initialize: function () {
            this.render();
            this.model.on('add:images', this.instantiateImageView, this);
            this.model.collection.application.on('swap', this.swapper, this);
        },

        render: function () {
            $("#resultImages").append(this.el);
        },

        instantiateImageView: function (imageModel) {
            imageModel.set('imageView', new Sultagit.Views.ImageView({model: imageModel, parent: this.$el, tag: this.model.get('tagName')}));
        },

        swapper: function () {
            var leader = this.model.get('images').at(0);
            var queue = this.model.get('images').where({position: 0});
            var leaderPosition = leader.get('position');
            var animationSpeed = this.model.collection.application.get('animationSpeed');

            if (queue.length > 0) {
                _.first(queue).trigger('slideIn');
                if (leaderPosition == this.model.collection.application.get('maxImages')) {
                    leader.destroy();
                }
            }
            else {
                if (leaderPosition > 1) {
                    leader.destroy();
                }
                else {
                    leader.trigger('fadeOut'); 
                }
            }
        }
    });

    // define the Image view - the DOM element for an image.
    Sultagit.Views.ImageView = Backbone.View.extend({
        tagName: 'img',

        // the HTML template that the view will render. 'src' is the url of the image and 'tagName' is the name of the parent Tag model
        // template: _.template($('#image-template').html()),

        initialize: function () {
            // this.html = this.template({src: this.model.get('src'), tagName: this.tag});
            this.$el.attr('src', this.model.get('src'));
            this.$el.attr('alt', this.options.tag);
            this.$el.attr('title', this.options.tag);
            this.listenTo(this.model, 'destroy', this.slideOut);
            this.listenTo(this.model, 'slideIn', this.slideIn);
            this.listenTo(this.model, 'fadeOut', this.fadeOut);
            this.animationSpeed = this.model.get('imageOf').get('application').get('animationSpeed');
        },

        // animate a slide in from "nowhere" to the top image
        slideIn: function () {
            this.options.parent.prepend(this.el);
            var startFromDistance = -50;

            //get the width of the parent element.
            var imgFinalHeight = this.options.parent.width();

            //animate the image
            TweenLite.fromTo(this.$el, this.animationSpeed, {top: startFromDistance, autoAlpha: 0}, {top: 0, autoAlpha: 1, height: imgFinalHeight, display: "block"});
            this.model.set('position', (this.model.get('position') + 1));
        },

        slideOut: function () {
            var _this = this;
            TweenLite.to(this.$el, this.animationSpeed, {top: "+=100", autoAlpha: 0,
            onComplete: function () {
                _this.remove();
                _this.unbind();
            }});
        },

        fadeOut: function () {
            var opacity = this.$el.css("opacity");
            if(opacity >= 0.1){
                TweenLite.to(this.$el, this.animationSpeed, {opacity: opacity - 0.1})
            }
        }
    });

    // define the search view
    Sultagit.Views.SearchView = Backbone.View.extend({
        el: $("#searchWrapper"),
        // id: 'searchForm',
        template: _.template($('#searchForm-template').html()),
        // tagName: 'div',
        events: {
            "click #submitButton": "validateInput",
            "keyup #submitButton": "validateInput",
            "keyup #searchbox": "validateInput"

        },

        initialize: function() {
            this.maxTags = this.model.get('maxTags');
            this.illegalHashtagChars = this.model.get('illegalHashtagChars');
            this.illegalSentenceChars = this.model.get('illegalSentenceChars');
            this.render();
        },

        render: function () {
            this.$el.html(this.template())
        },

        setQuery: function (words) {
            words = _.compact(words);
            if (words.length > this.maxTags) {
                words.length = this.maxTags;
            }
            console.log("setQuery '%o'", words);
            //test dummy array - remove when done developing
            words = ['picture', 'your', 'words'];
            this.model.set('query', words);
        },

        validateInput: function(e) {
            var searchBoxEl = this.$el.find('#searchbox');

            // create an array of words without empty values
            var words = _.compact(searchBoxEl.val().trim().split(this.illegalHashtagChars));
            
            //if its an 'enter' key or a mouse click
            if(e.which == 13 || e.which == 1){
                e.target.blur();
                this.setQuery(words);
            }
            else if (e.which == 32){
                if (words.length >= this.maxTags) {
                    this.showErrorMessage("maximum "+this.maxTags+" words allowed")
                    words.length=this.maxTags;
                    searchBoxEl.val(words.join(" "));
                }
            }
            else if (searchBoxEl.val().match(this.illegalSentenceChars)){
                this.showErrorMessage("only english letters and numbers please");
                searchBoxEl.val(words.join(" "));
            }
        },

        showErrorMessage: function (msg) {
            var messagesElement = this.$el.find("#messages");
            messagesElement.html(msg);
            TweenLite.to(messagesElement, 0.5, {autoAlpha: 1,
                onComplete: function() {
                    TweenLite.to(messagesElement, 0.75, {autoAlpha: 0, delay:0.75});
                }
            });
        }

    });


    // define the loader view
    Sultagit.Views.LoaderView = Backbone.View.extend({

        loaderTemplate: _.template($('#loader-template').html()),

        initialize: function () {

            // listen to status change in the model.
            this.model.on('change:status', function() {
                this.status = this.model.get('status');

                // if the status is anything but ready create a loader and append the message (if applicable)
                if (this.status !== 'ready') {
                    this.loaderVisible ? this.changeLoaderMessage() : this.displayLoader();
                }
                else {
                    this.loaderVisible = false;
                    this.$el.find('.loaderWrapper').remove();
                };
            }, this);
        },

        displayLoader: function () {
            this.loaderVisible = true;
            var template = this.loaderTemplate({message: this.status, displayOverlay: true});
            this.$el.prepend(template);
        },

        changeLoaderMessage: function () {
            this.$el.find('.loaderMessage').html(this.status);
        }
    });

    // kickoff the app
    window.app = new Sultagit.Models.App;

/*
    //start connecting to server animation
    // displayLoader($("html"), "Please Wait - Connecting to server", true);

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
                var wordsCount = str.split(illegalHashtagChars).length;
                if (wordsCount >= maxTags) {
                    displaySearchMessage("maximum "+maxTags+" words allowed");
                    $("#searchbox").val(str);
                }
            }
            if (str.match(illegalSentenceChars)) {
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
        // app.socket.emit('subscriptions',{handle: "stop"});
    });*/
}); //-- end $(document).ready()
/*
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
    var tags = queryString.split(illegalHashtagChars);
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
    // app.socket.emit('init', tags);
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
        // app.socket.emit('subscriptions',{handle: "unsubscribe", tags: tagNames});
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
    // displayLoader($(".tagImages"), "", false);
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
    // removeLoader($(".tagImages."+tagName));
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
/* app.socket.on('newData', function(data) {
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
*/
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
/*


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

*/