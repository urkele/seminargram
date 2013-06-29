var Backbone = require('backbone'),
    BacboneRleational = require('backbone-relational'),
    IGClient = require('./IGClient.js');

var Sultagit = Backbone.RelationalModel.extend({

    getIndex: function (req, res) {
        var live = (req.signedCookies.sultagitlive == 'live');
        var title = process.env.NODE_ENV ? 'sultag.it' : 'sultag.it - local';

        res.render('index', {open: "[%", close: "%]", title: title, live: live});
    },

    getTags: function (req, res) {

    },

    getDummy: function (req, res) {
        if (req.signedCookies.sultagitlive == 'live') {
            console.log('live authenticated');
        }
        else {
            console.log('not live');
        }
        var jsn = {
            'picture': {
                'tagName': 'picture',
                'images': [
                    {'src': 'http://distilleryimage2.s3.amazonaws.com/a7e615d2de4411e2927e22000a9e08e3_6.jpg'},//0
                    {'src': 'http://distilleryimage11.s3.amazonaws.com/9e3cb1c6de4411e29ae122000a1f9a03_6.jpg'},//1
                    {'src': 'http://distilleryimage1.s3.amazonaws.com/71772a54dd7c11e2988322000a1ddbb4_6.jpg'},//2
                    {'src': 'http://distilleryimage7.s3.amazonaws.com/9e3db04adb9b11e294d322000a1f8c09_6.jpg'},//3
                    {'src': 'http://distilleryimage1.s3.amazonaws.com/25b9fa56cdd211e2b55422000a9f1377_6.jpg'},//4
                    {'src': 'http://distilleryimage11.s3.amazonaws.com/d6e03da6de2411e29f1422000a1fbc0e_6.jpg'},//5
                    {'src': 'http://distilleryimage2.s3.amazonaws.com/8eecbca2de4411e2ac9b22000a1fb864_6.jpg'},//6
                    {'src': 'http://distilleryimage7.s3.amazonaws.com/9a6deb7ade4211e2bf1822000aaa0492_6.jpg'},//7
                    {'src': 'http://distilleryimage10.s3.amazonaws.com/8fa0521cde4411e29ef522000ae91450_6.jpg'},//8
                    {'src': 'http://distilleryimage7.s3.amazonaws.com/8ef634c6de4411e2ade722000a1faea4_6.jpg'},//9//16
                    {'src': 'http://distilleryimage2.s3.amazonaws.com/6f8174f4de3d11e2b9fd22000a1fbc16_6.jpg'},//10
                    {'src': 'http://distilleryimage7.s3.amazonaws.com/06d1d25edc2c11e2b36e22000a1fa437_6.jpg'},//11
                    {'src': 'http://distilleryimage7.s3.amazonaws.com/328a7da0de4411e2af5a22000a9f18fb_6.jpg'},//12
                    {'src': 'http://distilleryimage5.s3.amazonaws.com/0bad1418dd0911e2951522000a1f99d1_6.jpg'},//13
                    {'src': 'http://distilleryimage1.s3.amazonaws.com/9db2c326de4411e2bccd22000ae91234_6.jpg'},//14
                    // {'src': 'http://distilleryimage5.s3.amazonaws.com/eba5f2decd4f11e2890c22000a1fa80f_6.jpg'},
                    // {'src': 'http://distilleryimage9.s3.amazonaws.com/8f464a00d37311e287db22000aa803d4_6.jpg'},
                    {'src': 'http://distilleryimage4.s3.amazonaws.com/d168c012de4411e29a3e22000a1f90ce_6.jpg'}//15
                ]
            },
            'your': {
                'tagName': 'your',
                'images': [
                    {'src': 'http://distilleryimage5.s3.amazonaws.com/6df3493ade4411e2bbd422000a1f9ab2_6.jpg'},//0
                    {'src': 'http://distilleryimage4.s3.amazonaws.com/95ee56dcde4411e2bb3522000a1fb076_6.jpg'},//1
                    {'src': 'http://distilleryimage2.s3.amazonaws.com/959ddad6de4411e28dba22000a1f97e5_6.jpg'},//2
                    {'src': 'http://distilleryimage8.s3.amazonaws.com/4d23e020de4411e2984322000a1fcb7e_6.jpg'},//3
                    {'src': 'http://distilleryimage1.s3.amazonaws.com/5cbfbd6ade4411e2af7822000a1fb04e_6.jpg'},//4
                    {'src': 'http://distilleryimage11.s3.amazonaws.com/3c37be58de4411e2896922000a1fbe1a_6.jpg'},//5
                    {'src': 'http://distilleryimage0.s3.amazonaws.com/70e0aa52de4411e286d422000ae91435_6.jpg'},//6
                    {'src': 'http://distilleryimage1.s3.amazonaws.com/4bebbf5cde4411e28a7922000aeb0d1a_6.jpg'},//7
                    {'src': 'http://distilleryimage8.s3.amazonaws.com/6b63b3eede4411e2bbd422000a1f9ab2_6.jpg'},//8
                    {'src': 'http://distilleryimage2.s3.amazonaws.com/7824d25cde4411e289a922000aeb0c69_6.jpg'},//9
                    {'src': 'http://distilleryimage4.s3.amazonaws.com/6f6815b6de4411e2aaa222000a1fb843_6.jpg'},//10
                    {'src': 'http://distilleryimage9.s3.amazonaws.com/61604092de4411e2aa2222000a1f974c_6.jpg'},//11
                    {'src': 'http://distilleryimage11.s3.amazonaws.com/4930e5b2de4411e295f622000ae90e55_6.jpg'},//12
                    {'src': 'http://distilleryimage11.s3.amazonaws.com/1aa70b5ede4411e2a58222000a1fb810_6.jpg'},//13
                    {'src': 'http://distilleryimage3.s3.amazonaws.com/1fec5ff2de4311e28a7322000a1fa414_6.jpg'},//14
                    // {'src': 'http://distilleryimage0.s3.amazonaws.com/0f63d9acde4411e2900c22000a1fb715_6.jpg'},
                    // {'src': 'http://distilleryimage8.s3.amazonaws.com/cf16f6acd37311e2900122000a1f932b_6.jpg'},
                    {'src': 'http://distilleryimage0.s3.amazonaws.com/0f63d9acde4411e2900c22000a1fb715_6.jpg'}//15
                ]
            },
            'words': {
                'tagName': 'words',
                'images': [
                    {'src': 'http://distilleryimage0.s3.amazonaws.com/af822f4cde4411e2a94522000a1fbc56_6.jpg'},//0
                    {'src': 'http://distilleryimage3.s3.amazonaws.com/c023bf28de4411e2809922000ae911bb_6.jpg'},//1
                    {'src': 'http://distilleryimage9.s3.amazonaws.com/6f02caa6ddf611e2905922000ae9081c_6.jpg'},//2
                    {'src': 'http://distilleryimage7.s3.amazonaws.com/d1d9b8e4de4411e2984222000ae801ef_6.jpg'},//3
                    {'src': 'http://distilleryimage4.s3.amazonaws.com/fc18f76cddf611e2a94622000a1fbd9f_6.jpg'},//4
                    {'src': 'http://distilleryimage2.s3.amazonaws.com/c060bce8de4411e2b88d22000a1fd1dd_6.jpg'},//5
                    {'src': 'http://distilleryimage8.s3.amazonaws.com/d238a158da9111e29e0522000a1fa50c_6.jpg'},//6
                    {'src': 'http://distilleryimage11.s3.amazonaws.com/73067c4ede4411e289de22000a9f1406_6.jpg'},//7
                    {'src': 'http://distilleryimage8.s3.amazonaws.com/35f21112de4211e2844522000a1d1fdc_6.jpg'},//8
                    {'src': 'http://distilleryimage1.s3.amazonaws.com/2edbf266dc2c11e2bf1822000aaa0492_6.jpg'},//9
                    {'src': 'http://distilleryimage2.s3.amazonaws.com/0e6e8d30dbfb11e2b4f522000ae908a3_6.jpg'},//10
                    {'src': 'http://distilleryimage1.s3.amazonaws.com/7f1aa618de4411e2810822000aaa09c2_6.jpg'},//11
                    {'src': 'http://distilleryimage5.s3.amazonaws.com/3149db6cdaa111e2a7ab22000a1f97eb_6.jpg'},//12
                    {'src': 'http://distilleryimage5.s3.amazonaws.com/de948234dd6e11e2ade822000a1fa7aa_6.jpg'},//13
                    {'src': 'http://distilleryimage0.s3.amazonaws.com/e45ce7dade4311e2989522000a9f3c91_6.jpg'},//14
                    // {'src': 'http://distilleryimage5.s3.amazonaws.com/c7f1fee4d37311e2bab822000a9f3c25_6.jpg'},
                    // {'src': 'http://distilleryimage7.s3.amazonaws.com/b5283166d37311e2b4d922000a1fae83_6.jpg'},
                    // {'src': 'http://distilleryimage7.s3.amazonaws.com/4be712e4d37311e2926822000a1f9c9b_6.jpg'},
                    {'src': 'http://distilleryimage1.s3.amazonaws.com/738f7a30de4411e2b30a22000aa80109_6.jpg'}//15
                ]
            }
        };
        res.json(jsn[req.params.tagName]);
    }
});

module.exports.Sultagit = Sultagit;