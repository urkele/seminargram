var Backbone = require('backbone'),
    BacboneRleational = require('backbone-relational');

var Dispatcher =  new Backbone.Model.extends({
    defaults: {
        maxOps: 5000,
        interval: (60 * 1.01) * 60 * 1000, // mins (+1% to be safe) * secs * ms
        _numOps: 0,
        _queue: []
    },

    initialize: function () {
        this.set('_maxRate', this.get('maxOps') / this.get('interval'));
        this.set('_start', new Date().getTime());
    },

    schedule: function (fn, context, params) {
        var that = this;
        var rate = 0;
        var now = new Date().getTime();
        var elapsed = now - this._start;
        var fnObj = {fn: fn, params: params, context: context};

        if (elapsed > this.get('interval')) {
            this.set('_numOps', 0);
            this.set('_start', now);
        }

        rate = this.get('_numOps') / elapsed;
        if (rate < this.get('_maxRate')) {
            if (this.get('_queue').length === 0) {
                this.set('_numOps', this.get('_numOps') + 1);
                fn.apply(context, [params]);
            }
            else {
                if (fn) this.get('_queue').push(fnObj);

                this.set('_numOps', this.get('_numOps') + 1);
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
            if (fn) this.get('_queue').push(fnObj);

            setTimeout(function() {
                that.schedule();
            }, 1 / this.get('_maxRate'));
        }
    }

})

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