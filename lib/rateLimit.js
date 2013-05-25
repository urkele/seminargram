var RateLimit = (function() {
    var RateLimit = function(maxOps, interval, allowBursts) {
        this._maxRate = allowBursts ? maxOps : maxOps / interval;
        this._interval = interval;
        this._allowBursts = allowBursts;

        this._numOps = 0;
        this._start = new Date().getTime();
        this._queue = [];
    };

    RateLimit.prototype.schedule = function(fn, params) {
        var that = this,
                rate = 0,
                now = new Date().getTime(),
                elapsed = now - this._start,
                fnObj = {fn: fn, params: params};

        if (elapsed > this._interval) {
            this._numOps = 0;
            this._start = now;
        }

        rate = this._numOps / (this._allowBursts ? 1 : elapsed);

        if (rate < this._maxRate) {
            if (this._queue.length === 0) {
                this._numOps++;
                console.log("@rateLimit - executing");
                fn.apply(fn, [params]);
            }
            else {
                if (fn) this._queue.push(fnObj);

                this._numOps++;
                var o = this._queue.shift();
                var func = o.fn;
                var prms = o.params;
                
                console.log("@rateLimit - executing");
                func.apply(func, [prms]);
            }
        }
        else {
            if (fn) this._queue.push(fnObj);

            setTimeout(function() {
                that.schedule();
            }, 1 / this._maxRate);
        }
    };

    return RateLimit;
})();

module.exports = RateLimit;