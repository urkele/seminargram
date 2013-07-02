// Based on: http://www.matteoagosti.com/blog/2013/01/22/rate-limiting-function-calls-in-javascript/
var Backbone = require('backbone'),
    BacboneRleational = require('backbone-relational');

var Dispatcher = Backbone.Model.extend({
    defaults: {
        maxOps: 5000,
        interval: (60 * 1.01) * 60 * 1000, // mins (+1% to be safe) * secs * ms //test values (0.25 * 1.01) * 60 * 1000,
        numOps: 0,
        queue: []
    },

    initialize: function () {
        this.set('maxRate', this.get('maxOps') / this.get('interval'));
        this.set('start', new Date().getTime());
    },

    schedule: function (fn, params, context, important) {
        var _this = this;
        var rate = 0;
        var now = new Date().getTime();
        var elapsed = now - this.get('start');
        var fnObj = {fn: fn, params: params, context: context};

        if (elapsed > this.get('interval')) {
            this.set('numOps', 0);
            this.set('start', now);
        }

        rate = this.get('numOps') / elapsed;
        if (rate < this.get('maxRate')) {
            if (this.get('queue').length === 0) {
                this.set('numOps', this.get('numOps') + 1);
                fn.apply(context, [params]);
            }
            else {
                if (fn) {
                    important ? this.get('queue').unshift(fnObj) : this.get('queue').push(fnObj);
                }
                this.set('numOps', this.get('numOps') + 1);
                var o = this.get('queue').shift();
                var func = o.fn;
                var prms = o.params;
                var cntxt = o.context;

                func.apply(cntxt, [prms]);
            }
        }
        else {
            if (fn) {
                important ? this.get('queue').unshift(fnObj) : this.get('queue').push(fnObj);
            }

            setTimeout(function() {
                _this.schedule();
            }, 1 / this.get('maxRate'));
        }
    }
});

module.exports.Dispatcher = Dispatcher;