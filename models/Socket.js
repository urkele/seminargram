var Backbone = require('backbone'),
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
        var store = new MongoStore({url: this.get('mongoUrl')[process.env.NODE_ENV]});
        console.log('env is %s and its mongoUrl is ', process.env.NODE_ENV, this.get('mongoUrl')[process.env.NODE_ENV]);
        io.configure(function () {
            io.set('flash policy server', false);
            io.set('log level', (process.env.NODE_ENV == 'production') ? 1 : 2); // set socket.io logging level to 'warn'
            store.on('error', console.error);
            io.set('store', store);
        });
    },

    joinRoom: function (sid, room) {
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