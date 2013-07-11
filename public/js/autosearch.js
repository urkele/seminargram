var AutoSearch = {

    interval: 4500 * 15,
    currentIndex: 0,

    sentences: [
        "picture your words",
        "not a final project",
        "take a look around",
        "translation of words to images"
    ],

    autoSearcher: function () {
        if (AutoSearch.currentIndex > AutoSearch.sentences.length - 1) {
            AutoSearch.currentIndex = 0;
        }
        var i = AutoSearch.currentIndex;
        $('#searchbox').val(AutoSearch.sentences[i]);
        $('#submitButton').trigger('click');
        AutoSearch.currentIndex = i + 1;
    }
}

setInterval(AutoSearch.autoSearcher, AutoSearch.interval);
