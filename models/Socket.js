var Backbone = require('backbone'),
    _ = require('underscore'),
    BackboneRelational = require('backbone-relational'),
    MongoStore = require('socket.io-mongo'),
    sio = require('socket.io');

var Socket = Backbone.RelationalModel.extend({
    defaults: {
        io: {},
        mongoUrl: {
            production: 'mongodb://sultagit:hazulit@'+process.env.MONGO_URI,
            development: 'mongodb://sultagit-dev:hazulit@'+process.env.MONGO_URI,
            local: 'mongodb://localhost:27017/sultagit-local'
        }
    },

    initialize: function (server) {
        // mongo configuration
        var store = new MongoStore({url: this.get('mongoUrl')[process.env.NODE_ENV]});
        store.on('error', console.error);

        // start socket.io server
        this.set('io', sio.listen(server));

        //configure socket.io
        var io = this.get('io');
        var _this = this;
        io.configure(function () {
            io.set('flash policy server', false);
            io.set('log level', (process.env.NODE_ENV == 'production') ? 1 : 2); // set socket.io logging level to 'warn' on prod and 'info' on dev
            io.set('store', store);
        });

        // listen to client events
        io.sockets.on('connection', function (s) {
            s.on('rejoin_rooms', function (rooms) {
                console.log('rejoin_rooms from %s', rooms);
                if (!_this.get('master').get('tags')) {
                    console.error('error getting the \'tags\' collection');
                    s.emit('join_rooms_failed', rooms);
                    return;
                }
                var tags = _this.get('master').get('tags').pluck('tagName');
                _.each(rooms, function (room) {
                    if (tags.indexOf(room) > -1) {
                        _this.joinRoom(s.id, room);
                    }
                });
                s.emit('joined_rooms');
            });
        });
    },

    joinRoom: function (sid, room) {
        console.log('joining %s to %s', sid, room);
        var s = this.get('io').sockets.socket(sid);
        s.join(room);
    },

    leaveRoom: function (sid, room) {
        var s = this.get('io').sockets.socket(sid);
        s.leave(room);
    },

    emitToRoom: function (room, eventName, data) {
        var io = this.get('io');
        io.sockets.in(room).emit(eventName, data);
    },

    listRooms: function () {
        var io = this.get('io');
        return io.sockets.manager.rooms;
    },

    listRoomClients: function (room) {
        var rooms = this.listRooms();
        room = '/' + room;
        if (rooms[room]) {
            return rooms[room];
        }
        else {
            return [];
        }
    }
});

module.exports.Socket = Socket;