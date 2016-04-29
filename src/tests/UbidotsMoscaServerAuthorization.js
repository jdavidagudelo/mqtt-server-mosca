var validator = require("../Validator");
var sinon = require("sinon");
var request = require('request');
var server = require('../UbidotsMoscaServer.js');
var assert = require('chai').assert;
var testsCount = 100;
var mqtt = require("mqtt");
var tokens = [];
var tokensCount = 100;
var translateUrl = 'http://localhost:8087/api/v1.6/thg/';
var ubidotsDatasourcesUrl = 'http://localhost:8087/api/v1.6/datasources/';
var invalidUnicodeArray = ['\t', '\n', '\x0b', '\x0c', '\r', '\x1c', '\x1d', '\x1e', '\x1f',
                  ' ', '\x85', '\xa0', '\u1680', '\u180e', '\u2000', '\u2001', '\u2002',
                  '\u2003', '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009',
                  '\u200a', '\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '/',
                        '?', ':', '@', '&', '=', '+', '$', '#', ','];
String.prototype.repeat = function (num)
{
    return new Array(num + 1).join(this);
};

var MAX_UNICODE_CHAR = 65535;
function randomUnicode() {
    var max = 60;
    var n = Math.floor((Math.random() * max)) + 1;
    var r = "";
    for (var i = 0; i < n; i++) {
        var x = String.fromCharCode(Math.floor((Math.random() * MAX_UNICODE_CHAR)) + 1);
        if (invalidUnicodeArray.indexOf(x) < 0) {
            r += x;
        }
    }
    return r;
}

function getInvalidToken() {
    var token = randomToken();
    while (tokens.indexOf(token) >= 0) {
        token = randomToken();
    }
    return token;
}

function randomToken() {
    var n = Math.floor((Math.random() * 10)) + 1;
    return Math.random().toString(36).slice(2).repeat(n).substring(0, 60);
}

describe('Test Authorization Publish', function () {
    beforeEach(function (done) {
        tokens = [];
        for (var i = 0; i < tokensCount; i++) {
            tokens.push(randomToken());
        }
        sinon.stub(request, 'get', function (options, callback) {
            if (options.method === 'GET') {
                var uri = options.uri;
                var token = uri.substring(uri.indexOf('=') + 1);
                var response = {};
                if (tokens.indexOf(token) < 0) {
                    response.statusCode = 403;
                } else {
                    response.statusCode = 200;
                }
                var body = JSON.stringify({id:null});
                callback(null, response, body);
            }
        });
        sinon.stub(request, 'post', function(options, callback){
            if (options.method === 'POST') {
                callback(null, {statusCode: 200}, null);
            }
        });
        done();
    });

    afterEach(function (done) {
        request.get.restore();
        request.post.restore();
        done();
    });

    describe('Valid Tokens To Authorize', function () {
        it('Should allow user authorized with token to publish a value.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = tokens[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomUnicode();
                        var variable = randomUnicode();
                        var value = Math.random() * 100000;
                        var json = JSON.stringify({value: value});
                        client.publish("/v1.6/thg/" + dataSource + "/" + variable + "/value/post", json.toString(), {'qos': 1, 'retain': false}, function (error, response) {
                            assert.equal(response.qos, 1);
                            assert.equal(error, null);
                            client.end(true, function () {
                                count++;
                                if (count >= tokensCount) {
                                    done();
                                }
                            });

                        });
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                })(token);
            }
        });
        it('Should allow user authorized with token to subscribe to last value updates.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = tokens[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomUnicode();
                        var variable = randomUnicode();
                        var topic = "/v1.6/thg/" + token + "/" + dataSource + "/" + variable + "/value/lv";
                        var dict = {};
                        dict[topic] = 1;
                        client.subscribe(dict, function (error, granted) {
                            assert.equal(granted[0].qos, 1);
                            assert.equal(error, null);
                            client.end(true, function () {
                                count++;
                                if (count >= tokensCount) {
                                    done();
                                }
                            });

                        });
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                })(token);
            }
        });
        it('Should allow user authorized with token to subscribe to value updates.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = tokens[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomUnicode();
                        var variable = randomUnicode();
                        var topic = "/v1.6/thg/" + token + "/" + dataSource + "/" + variable + "/value";
                        var dict = {};
                        dict[topic] = 1;
                        client.subscribe(dict, function (error, granted) {
                            assert.equal(granted[0].qos, 1);
                            assert.equal(error, null);
                            client.end(true, function () {
                                count++;
                                if (count >= tokensCount) {
                                    done();
                                }
                            });

                        });
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                })(token);
            }
        });
        it('Should allow ubidots default user to publish a last value.', function (done) {
            this.timeout(0);
            var token = validator.TOKEN_UBIDOTS;
            var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
            client.on("connect", function (connack) {
                assert.notEqual(connack, null);
                var dataSource = randomUnicode();
                var variable = randomUnicode();
                var value = Math.random() * 100000;
                var userToken = randomToken();
                client.publish("/v1.6/thg/" + userToken + "/" + dataSource + "/" + variable + "/value/lv", value.toString(), {'qos': 1, 'retain': false}, function (error, response) {
                    assert.equal(response.qos, 1);
                    assert.equal(error, null);
                    client.end(true, function () {
                        done();
                    });

                });
            });
            client.on("error", function (error) {
                assert.equal(null, error);
                client.end(true, function () {
                    done();
                });
            });

        });
        it('Should allow ubidots default user to publish a value.', function (done) {
            this.timeout(0);
            var token = validator.TOKEN_UBIDOTS;
            var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
            client.on("connect", function (connack) {
                assert.notEqual(connack, null);
                var dataSource = randomUnicode();
                var variable = randomUnicode();
                var value = Math.random() * 100000;
                var userToken = randomToken();

                client.publish("/v1.6/thg/" + userToken + "/" + dataSource + "/" + variable + "/value", value.toString(), {'qos': 1, 'retain': false}, function (error, response) {
                    assert.equal(response.qos, 1);
                    assert.equal(error, null);
                    client.end(true, function () {
                        done();
                    });

                });
            });
            client.on("error", function (error) {
                assert.equal(null, error);
                client.end(true, function () {
                    done();
                });
            });

        });
    });
    describe('Invalid Token To Authorize', function () {
        it('Should not allow user with token to subscribe to post value updates.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = tokens[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomUnicode();
                        var variable = randomUnicode();
                        var topic = "/v1.6/thg/" + "/" + dataSource + "/" + variable + "/value/post";
                        var dict = {};
                        dict[topic] = 1;
                        client.subscribe(dict, function (error, granted) {
                            assert.equal(granted[0].qos, 128);
                            assert.equal(error, null);
                            client.end(true, function () {
                                count++;
                                if (count >= tokensCount) {
                                    done();
                                }
                            });

                        });
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                })(token);
            }
        });
        it('Should not allow user with token to subscribe to random topic.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = tokens[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var topic = randomUnicode();
                        if (!validator.isPublishValuePostUrl(topic) && !validator.isPublishSubscribeValue(topic) &&
                                !validator.isPublishSubscribeLastValue(topic)) {
                            var dict = {};
                            dict[topic] = 1;
                            client.subscribe(dict, function (error, granted) {
                                assert.equal(granted[0].qos, 128);
                                assert.equal(error, null);
                                client.end(true, function () {
                                    count++;
                                    if (count >= tokensCount) {
                                        done();
                                    }
                                });

                            });
                        } else {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        }
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        client.end(true, function () {
                            doneTokensAuthorization(token, done);
                        });
                    });
                })(token);
            }
        });
        it('Should not allow user with token to publish something to an unknown topic.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = tokens[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var value = Math.random() * 100000;
                        var topic = randomUnicode();
                        if (!validator.isPublishValuePostUrl(topic) && !validator.isPublishSubscribeValue(topic) &&
                                !validator.isPublishSubscribeLastValue(topic)) {
                            client.publish(topic, value.toString(), {'qos': 1, 'retain': false}, function (error, response) {
                                assert.notEqual(response.qos, 1);
                                assert.notEqual(error, null);
                                client.end(true, function () {
                                    count++;
                                    if (count >= tokensCount) {
                                        done();
                                    }
                                });
                            });
                        } else {
                            client.end(true, function () {
                                count++;
                                if (count >= tokensCount) {
                                    done();
                                }
                            });
                        }
                    });
                    client.on("close", function () {
                        assert.equal(0, 0);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                })(token);
            }
        });
        it('Should not allow user different to the ubidots default to publish a value.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = tokens[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomUnicode();
                        var variable = randomUnicode();
                        var value = Math.random() * 100000;
                        var userToken = randomToken();
                        client.publish("/v1.6/thg/" + userToken + "/" + dataSource + "/" + variable + "/value/", value.toString(), {'qos': 1, 'retain': false}, function (error, response) {
                            assert.notEqual(response.qos, 1);
                            assert.notEqual(error, null);
                            client.end(true, function () {
                                count++;
                                if (count >= tokensCount) {
                                    done();
                                }
                            });
                        });
                    });
                    client.on("close", function () {
                        assert.equal(0, 0);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                })(token);
            }
        });
        it('Should not allow user different to the ubidots default to publish a last value.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = tokens[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomUnicode();
                        var variable = randomUnicode();
                        var value = Math.random() * 100000;
                        var userToken = randomToken();
                        client.publish("/v1.6/thg/" + userToken + "/" + dataSource + "/" + variable + "/value/lv", value.toString(), {'qos': 1, 'retain': false}, function (error, response) {
                            assert.notEqual(response.qos, 1);
                            assert.notEqual(error, null);
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                            client.end();

                        });
                    });
                    client.on("close", function () {
                        assert.equal(0, 0);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                })(token);
            }
        });
    });
});
