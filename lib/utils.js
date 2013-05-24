var wrapFunction = function(func, context, params) {
    if (!context) {
        var context = func;
    }
    return function() {
        func.apply(context, params);
    };
};

module.exports.wrapFunction = wrapFunction;