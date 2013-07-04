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

    emitToRoom: function (room, eventName, data) {
        var io = this.get('io');
        io.sockets.in(room).emit(eventName, data);
    }
});

module.exports.Socket = Socket;
