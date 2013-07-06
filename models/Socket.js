var Backbone = require('backbone'),
    _ = require('underscore'),
    BackboneRelational = require('backbone-relational'),
    MongoStore = require('mong.socket.io');

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
        this.set('io', require('socket.io').listen(server));
        var io = this.get('io');
        var _this = this;
        var store = new MongoStore({url: this.get('mongoUrl')[process.env.NODE_ENV]});
        console.log('env is %s and its mongoUrl is ', process.env.NODE_ENV, this.get('mongoUrl')[process.env.NODE_ENV]);
        io.configure(function () {
            io.set('flash policy server', false);
            io.set('log level', (process.env.NODE_ENV == 'production') ? 1 : 2); // set socket.io logging level to 'warn'
            store.on('error', console.error);
            io.set('store', store);
        });

        io.sockets.on('connection', function (s) {
            s.on('rejoin_rooms', function (rooms) {
                console.log('rejoin_rooms', rooms);
                var tags = _this.get('master').get('tags').pluck('tagName');
                _.each(rooms, function (room, index, rooms) {
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