var Backbone = require('backbone'),
    BackboneRelational = require('backbone-relational');

var Socket = Backbone.RelationalModel.extend({
    defaults: {
        io: {}
    },

    initialize: function (server) {
        this.set('io', require('socket.io').listen(server));
        var io = this.get('io');
        io.configure(function () {
            io.set('flash policy server', false);
            io.set('log level', 1); // set socket.io logging level to 'warn'
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