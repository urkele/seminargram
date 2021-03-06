//TODO: handle sentence with repeating words

var Sultagit = {
    Models: {},
    Views: {},
    Collections: {}
};
$(function () {

    /**
    /* backbone models and collections
    **/

    // define the Image model
    Sultagit.Models.Image = Backbone.RelationalModel.extend({
        defaults: {
            'src': ""
        },

        destroy: function () {
            if (this.collection) {
                this.collection.remove(this);
                this.trigger('remove');
            }
        }
    });

    // define the Images collection
    Sultagit.Collections.Images = Backbone.Collection.extend({
        model: Sultagit.Models.Image
    });

    // define the Tag model
    Sultagit.Models.Tag = Backbone.RelationalModel.extend({
        defaults: {
            status: "",
            knownErrors: ['APINotAllowedError', 'tagsLimitReached', 'noImages'],
            sid: null
        },

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

        urlRoot: '/getTag',

        initialize: function () {
            if (this.collection.application.get('socket')) {
                this.getSocketId();
                this.listenTo(this.collection.application, 'change:status', this.getSocketId);
            }
            this.listenTo(this.collection.application, 'destroyTags', this.close);
        },

        getSocketId: function (m) {
            var application = m || this.collection.application;
            if (application.get('status') == 'ready') {
                this.set('sid', application.get('socket').get('socket').socket.sessionid);
            }
        },

        close: function () {
            this.stopListening();
            this.destroy({
                headers: this.get('sid') ? {
                    sid: this.get('sid') //this.get('application').get('socket').get('socket').socket.sessionid
                } : null
            });
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
            disconnect_event_fired: false
        },
        initialize: function () {
            this.createSocket();
            var s = this.get('socket');
            var thisModel = this;
            if (!s) {
                //TODO: throw error no socket.
            }

            // conecttion events
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

            // server custom events
            s.on('newImage', function (data) {
                thisModel.get('master').trigger('newImage', data);
            });
            s.on('joined_rooms', function () {
                console.log('rejoined rooms');
                thisModel.set('disconnect_event_fired', false);
            });
            s.on('join_rooms_failed', function (rooms) {
                console.error('failed to join rooms', rooms);
            });
        },
        createSocket: function () {
            this.set('socket', io.connect());
            // io.connect(,{'max reconnection attempts': 5, reconnection limit: 3000})
        },
        connectionConnected: function () {
            this.get('master').set('status', 'ready');
            console.info("socket connected with sid", this.get('socket').socket.sessionid);
            if (this.get('disconnect_event_fired')) {
                this.get('socket').emit('rejoin_rooms', this.get('master').get('tags').pluck('tagName'));
            }
        },
        connectionConnecting: function () {
            this.get('master').set('status', 'Connecting...');
            console.info("socket connecting");
        },
        connectionDisconnected: function () {
            this.get('master').set('status', 'Disconnected');
            this.set('disconnect_event_fired', true);
            console.warn("socket disconnected");
        },
        connectionFailed: function () {
            this.get('master').set('status', 'Failed to connect');
            console.warn("socket failed");
        }
    });

    //define the Info model
    Sultagit.Models.Info = Backbone.Model.extend({
        defaults: {
            title: "About Sultagit",
            text: "<p>אנחנו לא כותבים כמו שכתבנו פעם, ולא מדברים כמו שדיברנו פעם... אנחנו כותבים-מדברים.</p>"+
            "<p>הזמינות והנוחות של הטלפונים החכמים מאפשרת לנו לכתוב את השפה שאותה אנו מדברים.<br/>"+
            "המהירות שבה מועבר המסר, מאפשרת לנו לשוחח אחד עם השני בכתיבה. וגם הכתיבה עצמה השתדרגה – צילומים, אייקונים, סמלים וצבעים, הם חלק בלתי נפרד מהמסר. האותיות עצמן הן רק כלי אחד מכל אלו העומדים לרשותנו.</p>"+
            "<p>לא רק השפה השתנתה, גם הנמענים. הרשתות החברתיות מאפשרות לנו לנהל דו־שיח ורב־שיח במקביל.<br/>"+
            "כל ציוץ מועמד להפוך לצעקה, וכל סטטוס לעיתון יומי של האחר. כל דבר שנפרסם מגיע להרבה יותר אנשים משהיה יכול להגיע בעבר.</p>"+
            "<p>במרחב האינטרנטי הנייד, אינסטגרם מזמינה אותנו לתייג את התמונות שאנחנו מעלים במילות מפתח - סוּלְתָגִיוֹת (Hashtags). הסולתגיות מקטלגות, מקשרות, מרחיבות או מפיצות את התמונה שצילמתי. המשמעות של התמונה מורחבת או משתנה בהתאמה.</p>"+
            "<p>יצור הכלאיים, המורכב מתמונה ומילים, עומד בפני עצמו, ומתפקד כביטוי מילולי וחזותי במקביל.</p>"+
            "<p>העבודה שלנו, היא מעיין מילון תרבותי שיתופי מודרני – החוקר את התופעה הזו.</p>"+
            "<p>העבודה תעלה לאוויר ב-11/7 במקביל לפתיחת <a href='http://tinyurl.com/ksjuo52'>תערוכת הבוגרים של החוג לתקשורת צילומית במכללת הדסה</a>.</p>"
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
            'imageSwapInterval': 4500,
            'maxImages': 3,
            'maxTags': 6,
            'illegalHashtagChars': /[^\w]/,
            'illegalSentenceChars': /[^\w\s]/,
            'status': '',
            'resultDimensions': [],
            'loaderWrapperOverlay' : true,
            'fetchXhrs': []
        },

        // init the App model
        initialize: function () {

            if (this.isSmartphone()) {
                new Sultagit.Views.SmartphoneView();
                return;
            }

            // load the socket model and view if it should be loaded
            this.maybeLoadSocket();

            // set the Swap Interval of the app and the animation speed //TODO: do only when query is sent to server.
            this.setAppSpeeds();

            // bind to a change event of 'imageSwapInterval' in order to reset application speed values if changed
            this.on('change:imageSwapInterval', this.setAppSpeeds); //FIXME: on app init, setAppSpeeds is called twice

            // bind to change event of 'query' in order to trigger a new query sequence
            this.listenTo(this, 'query', function (words) {
                this.set('query', words);
                if (this.get('tags').length !== 0) {
                    this.queryCleanup();
                }
                else {
                    this.startNewQuery();
                }
            });
            this.listenTo(this.get('tags'), 'destroy', function () {
                if (this.get('tags').length === 0) {
                    this.startNewQuery();
                }
            });

            // bind to the showInfo event to show the info view
            this.on('showInfo', function () {
                var infoModel = new Sultagit.Models.Info();
                new Sultagit.Views.infoView({model: infoModel});
            });

            // bind to the 'newImage' to add the new images to the relevant models
            this.on('newImage', this.addNewImages);

            // create the search form view
            new Sultagit.Views.SearchView({model: this});
            new Sultagit.Views.SearchError({model: this});

            // create the pause button view
            new Sultagit.Views.pauseButtonView({model: this});

            // create the info button view
            new Sultagit.Views.infoButtonView({model: this});

            //caculate the width of a result container and its right margin
            this.claculateImageContainer();

            // create the result styling view
            new Sultagit.Views.ResultStylingView({model:this});

        },

        // if socket.io is defined, instatiate the appropriate model and view
        maybeLoadSocket: function () {
            _this = this;
            $("script").each(function() {
                if (this.src.indexOf('socket.io') !== -1) {

                    // create a socket.io connection
                    new Sultagit.Models.Socket({master: _this});

                    // create the loader view
                    _this.loaderView = new Sultagit.Views.LoaderView({model: _this, parent: $('html')});

                    return;
                }
            });
        },

        // this function will test if this is a smartphone device - note - does not detect tablets on purpose
        isSmartphone: function() {
            var check = false;
            (function(a) {
                if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
            })(navigator.userAgent || navigator.vendor || window.opera);
            return check;
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
            }

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
            var seperatorDivHeight = $(".separator").outerHeight(true);
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

            // Cancel pending server requests
            _.each(this.get('fetchXhrs'), function (fetchXhr, index, fetchXhrs) {
                if (fetchXhr.readyState > 0 && fetchXhr.readyState < 4) {
                    fetchXhr.abort();
                }
                fetchXhrs.splice(index, 1);
            });

            // reset the 'tags' collection (should trigger the destruction of all child (and grandchild etc..) elements)
            this.trigger('destroyTags');
        },

        startNewQuery: function () {
            var words = this.get('query');
            _.each(words, function (word) {

                // instatiate the tagModel and add it to the 'tags' collection
                this.get('tags').add({tagName: word});
                var tag = this.get('tags').get(word);

                // create the views to hold the title and images of this word.
                new Sultagit.Views.TagTitleView({model: tag});
                new Sultagit.Views.TagImagesView({model: tag});

                // fetch the tagModel's data from the server (instatiating the 'imageModel' and fetching its data on the way)
                var fetchXhr = tag.fetch({
                    success: function (model, response, options) {
                        model.set('status', 'ready');
                    },
                    error: function (model, response, options) {
                        model.set('status', 'error getting data');
                    },
                    data: this.get('socket') ? {sid: this.get('socket').get('socket').socket.sessionid} : null
                });
                this.get('fetchXhrs').push(fetchXhr);
            }, this);
        },

        addNewImages: function (data) {
            this.get('tags').add(data, {merge: true});
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

        className: function () {return 'tagTitle '+this.model.get('tagName');},

        initialize: function () {
            this.listenTo(this.model, 'destroy', this.destroy);
            this.listenTo(this.model, 'change:error', this.strikeThrough);
            this.render();
        },

        render: function () {
            $("#resultTitles").append(this.el);
            this.$el.html(this.model.get('tagName'));
        },

        strikeThrough: function (m) {
            this.$el.addClass('erroredTagTitle');
        },

        destroy: function () {
            this.remove();
            this.unbind();
        }
    });

    // define the Tag images view - the DOM element that hold all the images for a tag
    Sultagit.Views.TagImagesView = Backbone.View.extend({

        className: function () {return 'tagImages '+this.model.get('tagName');},

        initialize: function () {
            this.imageViews = [];
            new Sultagit.Views.LoaderView({model: this.model, parent: this.$el});
            this.render();
            this.listenTo(this.model, 'add:images', this.instantiateImageView);
            this.listenTo(this.model.collection.application, 'swap', this.swapper);
            this.listenTo(this.model, 'destroy', this.destroy);
            this.listenTo(this.model, 'change:error', this.displayError);
            this.listenTo(this.model, 'change:status', this.testEmpty);
        },

        render: function () {
            $("#resultImages").append(this.el);
        },

        instantiateImageView: function (imageModel) {
            this.imageViews.push(new Sultagit.Views.ImageView({model: imageModel, parent: this.$el, tag: this.model.get('tagName')}));
        },

        testEmpty: function () {
            if (this.model.get('images').length === 0) {
                this.model.set('error', {errorMessage: 'noImages', errorObject: 'No images for "'+this.model.get('tagName')+'"'});
            }
        },

        displayError: function (m) {
            var errEl = $('<div class="imgError"></div>');
            var msg = 'unknown error';
            var err = m.get('error');
            if (m.get('knownErrors').indexOf(err.errorMessage) !== -1) {
                msg = err.errorObject;
            }
            else {
                console.log("error getting tags for %s: %o", m.get('tagName'), err);
            }
            errEl.text(msg);
            this.$el.html(errEl);
        },

        swapper: function () {
            if (this.imageViews.length <= 0) {
                return;
            }
            // clear images that have been removed from the DOM
            var removed = _.where(this.imageViews, {removed: true});
            var _this = this;
            _.each(removed, function (imageView) {
                var i = _.indexOf(_this.imageViews, imageView);
                if (i > -1) {
                    _this.imageViews.splice(i, 1);
                }
            });

            //animate the images
            var visible = _.where(this.imageViews, {rendered: true});
            var queue = _.where(this.imageViews, {rendered: false});
            var animationSpeed = this.model.collection.application.get('animationSpeed');

            if (queue.length > 0) {
                _.first(queue).trigger('render');
                if (visible.length >= this.model.collection.application.get('maxImages')) {
                    if (_.first(visible).model) {
                        _.first(visible).model.destroy();
                    }
                    else {
                        _.first(visible).trigger('destroy');
                    }
                }
            }
            else {
                if (visible.length == 1) {
                    _.first(visible).trigger('fadeOut');
                }
                else {
                    if (_.first(visible).model) {
                        _.first(visible).model.destroy();
                    }
                    else {
                        _.first(visible).trigger('destroy');
                    }
                }
            }
        },

        destroy: function () {
            this.remove();
            this.unbind();
        }
    });

    // define the Image view - the DOM element for an image.
    Sultagit.Views.ImageView = Backbone.View.extend({
        tagName: 'img',

        initialize: function () {
            this.rendered = false;
            this.removed = false;
            this.$el.attr('src', this.model.get('src'));
            this.$el.attr('alt', this.options.tag);
            this.$el.attr('title', this.options.tag);
            this.listenTo(this, 'render', this.render);
            this.listenTo(this, 'fadeOut', this.fadeOut);
            this.listenTo(this, 'destroy', this.destroy);
            this.listenTo(this.model, 'remove', this.destroy);
            this.animationSpeed = this.model.get('imageOf').get('application').get('animationSpeed');
        },

        // animate a slide in from "nowhere" to the top image
        render: function () {
            this.options.parent.prepend(this.el);
            var startFromDistance = -50;

            //get the width of the parent element.
            var imgFinalHeight = this.options.parent.width();

            //animate the image
            TweenLite.fromTo(this.$el, this.animationSpeed, {top: startFromDistance, autoAlpha: 0}, {top: 0, autoAlpha: 1, height: imgFinalHeight, display: "block"});
            this.rendered = true;
        },

        destroy: function () {
            var _this = this;
            TweenLite.to(this.$el, this.animationSpeed, {top: "+=100", autoAlpha: 0,
            onComplete: function () {
                _this.remove();
                _this.unbind();
                _this.removed = true;
            }});
        },

        fadeOut: function () {
            var opacity = this.$el.css("opacity");
            if(opacity >= 0.1){
                TweenLite.to(this.$el, this.animationSpeed, {opacity: opacity - 0.1});
            }
        }
    });

    // define the search view
    Sultagit.Views.SearchView = Backbone.View.extend({
        el: $("#searchForm"),

        events: {
            "click #submitButton": "validateInput",
            "keyup #submitButton": "validateInput",
            "keyup #searchbox": "validateInput"
        },

        initialize: function() {
            this.maxTags = this.model.get('maxTags');
            this.illegalHashtagChars = this.model.get('illegalHashtagChars');
            this.illegalSentenceChars = this.model.get('illegalSentenceChars');
        },

        clearBox: function (e) {
            $(e.target).val('');
        },

        setQuery: function (words) {
            words = _.compact(words);
            if (words.length > this.maxTags) {
                words.length = this.maxTags;
            }
            this.model.trigger('query', words);
        },

        validateInput: function(e) {
            var searchBoxEl = this.$el.find('#searchbox');

            // create an array of words without empty values
            var words = _.compact(searchBoxEl.val().trim().split(this.illegalHashtagChars));

            // if its an 'enter' key or a mouse click
            if(e.which == 13 || e.which == 1 || e.type == 'click'){
                e.target.blur();
                this.setQuery(words);
            }
            // if its a 'space' key
            else if (e.which == 32){
                if (words.length >= this.maxTags) {
                    this.model.trigger('maxSearchError');
                    words.length=this.maxTags;
                    searchBoxEl.val(words.join(" "));
                }
            }
            else if (searchBoxEl.val().match(this.illegalSentenceChars)){
                this.model.trigger('illegalSearchError');
                searchBoxEl.val(words.join(" "));
            }
        }
    });

    // define the Search Error view
    Sultagit.Views.SearchError = Backbone.View.extend({
        el: $('#searchError'),

        initialize: function () {
            this.listenTo(this.model, 'maxSearchError', this.showMaxSearchError);
            this.listenTo(this.model, 'illegalSearchError', this.showIllegalSearchError);
        },

        showMaxSearchError: function () {
            this.showErrorMessage("maximum "+this.model.get('maxTags')+" words allowed");
        },

        showIllegalSearchError: function () {
            this.showErrorMessage("only english letters and numbers please");
        },

        showErrorMessage: function (msg) {
            this.$el.html(msg);
            thisEl = this.$el;
            TweenLite.to(this.$el, 0.5, {autoAlpha: 1,
                onComplete: function() {
                    TweenLite.to(thisEl, 0.75, {autoAlpha: 0, delay:0.75});
                }
            });
        }
    });

    // define the loader view
    Sultagit.Views.LoaderView = Backbone.View.extend({

        className: function () {return 'loaderWrapper' + (this.model.get('loaderWrapperOverlay') ? ' loaderWrapperOverlay' : '');},

        template: _.template($('#loader-template').html()),

        initialize: function () {

            // listen to status change in the model.
            this.model.on('change:status', function() {
                this.status = this.model.get('status');

                // if the status is anything but ready create a loader and append the message (if applicable)
                if (this.status !== 'ready') {
                    this.loaderVisible ? this.changeLoaderMessage() : this.render();
                }
                else {
                    this.loaderVisible = false;
                    this.remove();
                }
            }, this);
        },

        render: function () {
            this.loaderVisible = true;
            this.$el.html(this.template({status: this.status}));
            // var template = 
            this.options.parent.prepend(this.$el);
        },

        changeLoaderMessage: function () {
            this.$el.find('.loaderMessage').html(this.status);
        }
    });

    // define the pause button view
    Sultagit.Views.pauseButtonView = Backbone.View.extend({
        el: $('#pauseButton'),

        events: {
            "click": "tooglePause"
        },

        initialize: function () {
            this.originalSpeed = this.model.get('imageSwapInterval');
            this.listenTo(this.model.get('tags'), 'add:images', this.show);
            this.listenTo(this.model, 'query', this.hide);
        },

        show: function () {
            TweenLite.to(this.$el, 1, {autoAlpha: 1});
        },

        hide: function () {
            clearInterval(this.intervalId);
            this.model.set('imageSwapInterval', this.originalSpeed);
            this.$el.removeClass('hiddenVal');
            TweenLite.to(this.$el, 0, {autoAlpha: 0});
        },

        tooglePause: function () {
            var thisEl = this.$el;
            // unpause
            if (this.model.get('imageSwapInterval') == 999999999) {
                this.model.trigger('swap');
                this.model.set('imageSwapInterval', this.originalSpeed);
                clearInterval(this.intervalId);
                this.$el.removeClass('hiddenVal');
            }
            // pause
            else {
                this.originalSpeed = this.model.get('imageSwapInterval');
                this.model.set('imageSwapInterval', 999999999);
                this.intervalId = setInterval(function () {
                    thisEl.toggleClass('hiddenVal');
                }, 750);
            }
        }
    });

    // define the info button view
    Sultagit.Views.infoButtonView = Backbone.View.extend({
        el: $('#infoButton'),

        events: {
            "click": "showInfo"
        },

        showInfo: function () {
            this.model.trigger('showInfo');
        }
    });

    // define the info view
    Sultagit.Views.infoView = Backbone.View.extend({
        id: 'infoWrapper',

        template: _.template($('#info-template').html()),

        events: {
            "click #closeInfo": "closeInfo"
        },

        initialize: function () {
            this.listenTo(this.model, 'destroy', this.destory);
            this.render();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            $('html').prepend(this.$el);
        },

        closeInfo: function () {
            this.model.destroy();
        },

        destory: function () {
            this.remove();
            this.unbind();
        }
    });

    Sultagit.Views.SmartphoneView = Backbone.View.extend({
        id: "smartphoneMessage",

        template: _.template($('#smartphoneMessage-template').html()),
        styleEl: '<style type="text/css">#maincontainer .separator{width:0}</style>',

        initialize: function () {
            this.render();
        },

        render: function () {
            $('head').append(this.styleEl);
            this.$el.html(this.template());
            $('html').prepend(this.$el);
        }
    });

    // kickoff the app
    window.app = new Sultagit.Models.App();

});