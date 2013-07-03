var Backbone = require('backbone'),
    BackboneRelational = require('backbone-relational');

var Socket = Backbone.RelationalModel.extend({

    initialize: function (server) {
        console.log('starting socket');
        io = require('socket.io').listen(server);
        io.configure(function () {
            io.set('flash policy server', false);
            io.set('log level', 1); // set socket.io logging level to 'warn'
        });
    }
});

module.exports.Socket = Socket;
/*
    createSocket: function (server) {
        io = require('socket.io').listen(server);
        io.configure(function () {
            io.set('flash policy server', false);
            io.set('log level', 1); // set socket.io logging level to 'warn'
        });
        io.sockets.on('connection', function (socket) {
            socket.emit('connection', 'connected');
            socket.on('init', function (requestedTagsDirty) {
                console.log("@gramroutes.createSocket - got init form client:", requestedTagsDirty);
                if (requestedTagsDirty && requestedTagsDirty.length !== 0) {
                    //TODO: also clean duplicate tags and clean non alpha numeric letters
                    for (var badIndex = requestedTagsDirty.indexOf(""); badIndex > -1; badIndex = requestedTagsDirty.indexOf("")) {
                        requestedTagsDirty.splice(badIndex, 1);
                    }
                    var requestedTags = requestedTagsDirty;
                };
                if (requestedTags && requestedTags.length !== 0) {
                    getInitialData(requestedTags, socket.id, function(err, data) {
                        if (err) {
                            console.log("@gramroutes.createSocket - error getting initial data:", err);
                        }
                        else {
                            // console.log("@gramroutes.createSocket - got initial data:", data);
                            socket.emit('newData', data);
                        };
                    })
                }
                else {
                    console.log("@gramroutes.createSocket - no tags requested")
                }
            });
            socket.on('subscriptions', function (data) {
                console.log("@gramroutes.createSocket - got 'subscriptions' form client", data);
                if (data.handle) {
                    if (data.handle == "stop") {
                        unsubscribeAll(function (data) {
                            socket.emit('debug', {"unsubscribed": data});
                        });
                    }
                    else if (data.handle == "unsubscribe") {
                        unregisterTags(data.tags, socket.id, function (err) {
                            if (err) {
                                console.log("@gramroutes.createSocket - error unsubscribing tags:", err);
                            }
                            else {
                                socket.emit('debug', {"unsubscribedTags": data.tags});
                            }
                        });
                    }
                }
            });
        });
    }
*/