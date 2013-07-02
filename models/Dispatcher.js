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

    schedule: function (fn, params, context) {
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
                if (fn) this.get('queue').push(fnObj);
                this.set('numOps', this.get('numOps') + 1);
                var o = this.get('queue').shift();
                var func = o.fn;
                var prms = o.params;
                var cntxt = o.context;

                func.apply(cntxt, [prms]);
            }
        }
        else {
            if (fn) this.get('queue').push(fnObj);

            setTimeout(function() {
                _this.schedule();
            }, 1 / this.get('maxRate'));
        }
    }
});

module.exports.Dispatcher = Dispatcher;
/*
var RateLimit = function(maxOps, interval, allowBursts) {
        this._maxRate = allowBursts ? maxOps : maxOps / interval;
        this._interval = interval;
        this._allowBursts = allowBursts;

        this._numOps = 0;
        this._start = new Date().getTime();
        this._queue = [];
        // console.log("@rateLimit - %d(maxOps) / %d(interval) = %d(_maxRate)",maxOps, interval, this._maxRate);
    };


    RateLimit.prototype.schedule = function(fn, context, params) {
        var that = this,
                rate = 0,
                now = new Date().getTime(),
                elapsed = now - this._start,
                fnObj = {fn: fn, params: params, context: context};

        if (elapsed > this._interval) {
            this._numOps = 0;
            this._start = now;
        }

        rate = this._numOps / (this._allowBursts ? 1 : elapsed);
        if (rate < this._maxRate) {
            if (this._queue.length === 0) {
                this._numOps++;
                // console.log("@rateLimit - empty queue. rate is %d. executing", rate);
                fn.apply(context, [params]);
            }
            else {
                if (fn) this._queue.push(fnObj);

                this._numOps++;
                var o = this._queue.shift();
                var func = o.fn;
                var prms = o.params;
                var cntxt = o.context;

                // console.log("@rateLimit - queue not empty. rate is %d. executing", rate);
                func.apply(cntxt, [prms]);
            }
        }
        else {
            // console.log("@rateLimit - rate is %d. queuing", rate);
            if (fn) this._queue.push(fnObj);

            setTimeout(function() {
                that.schedule();
            }, 1 / this._maxRate);
        }
    };
*/