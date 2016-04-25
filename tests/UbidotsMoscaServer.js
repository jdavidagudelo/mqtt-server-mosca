var server = require("../UbidotsMoscaServer");
var assert = require('chai').assert;
var pg = require('pg');
var testsCount = 100;
String.prototype.repeat = function (num)
{
    return new Array(num + 1).join(this);
};
function randomToken() {
    var n = Math.floor((Math.random() * 10)) + 1;
    return Math.random().toString(36).slice(2).repeat(n).substring(0, 60);
}
describe('Token Validations', function () {
    describe('#Invalid Subscribe Value Token', function () {
        it('Should return false if subscribe value token is null or undefined.', function () {
            assert.equal(false, server.validSubscribeValueToken(null));
            assert.equal(false, server.validSubscribeValueToken(undefined));
        });
    });
    describe('#Valid Subscribe Value Token', function () {
        it('Should return true for any randomly generated token.', function () {
            for (var i = 0; i < testsCount; i++) {
                var token = randomToken();
                assert.equal(true, server.validSubscribeValueToken(token));
            }
        });
    });
    describe('#Invalid Subscribe Last Value Token', function () {
        it('Should return false if subscribe last value token is null or undefined.', function () {
            assert.equal(false, server.validSubscribeLastValueToken(null));
            assert.equal(false, server.validSubscribeLastValueToken(undefined));
        });
    });
    describe('#Valid Subscribe Last Value Token', function () {
        it('Should return true for any randomly generated token.', function () {
            for (var i = 0; i < testsCount; i++) {
                var token = randomToken();
                assert.equal(true, server.validSubscribeLastValueToken(token));
            }
        });
    });
    describe('#Invalid Publish Post Value Token', function () {
        it('Should return false if publish post value token is null or undefined.', function () {
            assert.equal(false, server.validPublishValuePostToken(null));
            assert.equal(false, server.validPublishValuePostToken(undefined));
        });
    });
    describe('#Valid Publish Post Value Token', function () {
        it('Should return true for any randomly generated token.', function () {
            for (var i = 0; i < testsCount; i++) {
                var token = randomToken();
                assert.equal(true, server.validSubscribeLastValueToken(token));
            }
        });
    });
    describe('#Invalid Publish Value Token', function () {
        it('Should return false if publish value token is null or undefined.', function () {
            assert.equal(false, server.validPublishValueToken(null));
            assert.equal(false, server.validPublishValueToken(undefined));
        });
    });
    describe('#Invalid Publish Value Token', function () {
        it('Should return false for any randomly generated token different to TOKEN_UBIDOTS.', function () {
            for (var i = 0; i < testsCount; i++) {
                var token = randomToken();
                if (token !== server.TOKEN_UBIDOTS) {
                    assert.equal(false, server.validPublishValueToken(token));
                }
            }
        });
    });
    describe('#Valid Publish Value Token', function () {
        it('Should return true if publish value token is TOKEN_UBIDOTS.', function () {
            assert.equal(true, server.validPublishValueToken(server.TOKEN_UBIDOTS));
        });
    });
    describe('#Invalid Publish Last Value Token', function () {
        it('Should return false if publish last value token is null or undefined.', function () {
            assert.equal(false, server.validPublishLastValueToken(null));
            assert.equal(false, server.validPublishLastValueToken(undefined));
        });
    });
    describe('#Invalid Publish Last Value Token', function () {
        it('Should return false for any randomly generated token different to TOKEN_UBIDOTS.', function () {
            for (var i = 0; i < testsCount; i++) {
                var token = randomToken();
                if (token !== server.TOKEN_UBIDOTS) {
                    assert.equal(false, server.validPublishLastValueToken(token));
                }
            }
        });
    });
    describe('#Valid Publish Value Token', function () {
        it('Should return true if publish value token is TOKEN_UBIDOTS.', function () {
            assert.equal(true, server.validPublishLastValueToken(server.TOKEN_UBIDOTS));
        });
    });
});

describe('Topic Validations', function () {
    describe('#Invalid Publish Value Post Topic', function () {
        it('Should return false for null or undefined topic.', function () {
            assert.equal(false, server.isPublishValuePostUrl(undefined));
            assert.equal(false, server.isPublishValuePostUrl(null));
        });
        it('Should return false for random string not matching the regex.', function () {
            for (var i = 0; i < testsCount; i++) {
                var topic = randomToken();
                assert.equal(false, server.isPublishValuePostUrl(topic));
            }
        });
        it('Should return false for any string matching the regex of last value.', function () {
            for (var i = 0; i < testsCount; i++) {
                var dataSource = randomToken();
                var variable = randomToken();
                var token = randomToken();
                var topic = "/v1.6/thg/" + token + "/" + dataSource + "/" + variable + "/value/lv";
                assert.equal(false, server.isPublishValuePostUrl(topic));
            }
        });
        it('Should return false for any string matching the regex value.', function () {
            for (var i = 0; i < testsCount; i++) {
                var dataSource = randomToken();
                var variable = randomToken();
                var token = randomToken();
                var topic = "/v1.6/thg/" + token + "/" + dataSource + "/" + variable + "/value/";
                assert.equal(false, server.isPublishValuePostUrl(topic));
            }
        });
    });
    describe('#Valid Publish Value Post Topic', function () {
        it('Should return true for any string matching the regex.', function () {
            for (var i = 0; i < testsCount; i++) {
                var dataSource = randomToken();
                var variable = randomToken();
                var topic = "/v1.6/thg/" + dataSource + "/" + variable + "/value/post/";
                assert.equal(true, server.isPublishValuePostUrl(topic));
            }
        });
    });
    describe('#Invalid Publish Value Topic', function () {
        it('Should return false for null or undefined topic.', function () {
            assert.equal(false, server.isPublishSubscribeValue(undefined));
            assert.equal(false, server.isPublishSubscribeValue(null));
        });
        it('Should return false for random string not matching the regex.', function () {
            for (var i = 0; i < testsCount; i++) {
                var topic = randomToken();
                assert.equal(false, server.isPublishSubscribeValue(topic));
            }
        });
        it('Should return false for any string matching the regex of last value.', function () {
            for (var i = 0; i < testsCount; i++) {
                var dataSource = randomToken();
                var variable = randomToken();
                var token = randomToken();
                var topic = "/v1.6/thg/" + token + "/" + dataSource + "/" + variable + "/value/lv";
                assert.equal(false, server.isPublishSubscribeValue(topic));
            }
        });
        it('Should return false for any string matching the regex post value.', function () {
            for (var i = 0; i < testsCount; i++) {
                var dataSource = randomToken();
                var variable = randomToken();
                var topic = "/v1.6/thg/" + dataSource + "/" + variable + "/value/post/";
                assert.equal(false, server.isPublishSubscribeValue(topic));
            }
        });
    });
    describe('#Valid Publish Last Value Topic', function () {
        it('Should return true for any string matching the regex.', function () {
            for (var i = 0; i < testsCount; i++) {
                var dataSource = randomToken();
                var variable = randomToken();
                var token = randomToken();
                var topic = "/v1.6/thg/" + token + "/" + dataSource + "/" + variable + "/value/";
                assert.equal(true, server.isPublishSubscribeValue(topic));
            }
        });
    });
    describe('#Invalid Publish Last Value Topic', function () {
        it('Should return false for null or undefined topic.', function () {
            assert.equal(false, server.isPublishSubscribeLastValue(undefined));
            assert.equal(false, server.isPublishSubscribeLastValue(null));
        });
        it('Should return false for random string not matching the regex.', function () {
            for (var i = 0; i < testsCount; i++) {
                var topic = randomToken();
                assert.equal(false, server.isPublishSubscribeLastValue(topic));
            }
        });
        it('Should return false for any string matching the regex of value.', function () {
            for (var i = 0; i < testsCount; i++) {
                var dataSource = randomToken();
                var variable = randomToken();
                var token = randomToken();
                var topic = "/v1.6/thg/" + token + "/" + dataSource + "/" + variable + "/value/";
                assert.equal(false, server.isPublishSubscribeLastValue(topic));
            }
        });
        it('Should return false for any string matching the regex post value.', function () {
            for (var i = 0; i < testsCount; i++) {
                var dataSource = randomToken();
                var variable = randomToken();
                var topic = "/v1.6/thg/" + dataSource + "/" + variable + "/value/post/";
                assert.equal(false, server.isPublishSubscribeLastValue(topic));
            }
        });
    });
    describe('#Valid Publish Last Value Topic', function () {
        it('Should return true for any string matching the regex.', function () {
            for (var i = 0; i < testsCount; i++) {
                var dataSource = randomToken();
                var variable = randomToken();
                var token = randomToken();
                var topic = "/v1.6/thg/" + token + "/" + dataSource + "/" + variable + "/value/lv";
                assert.equal(true, server.isPublishSubscribeLastValue(topic));
            }
        });
    });
});


