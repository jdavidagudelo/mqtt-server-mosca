var server = require("../Validator");
var assert = require('chai').assert;
var pg = require('pg');
var testsCount = 10000;
var mqtt = require("mqtt");
var conString = "postgres://ubidots:ubidotsDevel@localhost/ubidots_devel1";
var tokens = [];
var tokensCount = 100;
var tokensString = [];
var invalidTokens = [];
var tokensAuthorizedPublish = [];
var invalidTestsCount = testsCount;
var validTokensDone = false;
var invalidTokensDone = false;
var currentToken = "c74qFmzI7ikTmZ3dFvF3e2hPEmCfu5";
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
function randomToken() {
    var n = Math.floor((Math.random() * 10)) + 1;
    return Math.random().toString(36).slice(2).repeat(n).substring(0, 60);
}
function updateTokens(token, maxTokens, client, done) {
    tokens.push(token);
    if (tokens.length === maxTokens) {
        client.end();
        done();
    }
}

function removeToken(result, client, done) {
    tokens.pop(result);
    if (tokens.length === 0) {
        client.end();
        tokensString = [];
        done();
    }
}
function updateClient(done) {
    var userId = -1;
    var client = new pg.Client(conString);
    client.connect(function (err) {
        if (err) {
            return console.error('could not connect to postgres', err);
        }
        var token = randomToken();
        currentToken = token;
        client.query("insert into apikey_token(user_id, token, last_used, expires, name) values($1, $2, $3, $4, $5) RETURNING id;",
                [userId, token, new Date(), false, "newName"],
                function (err, result) {
                    if (err) {
                        return console.error('error running query', err);
                    }
                    done();
                });
    });
}

describe('Test Authorization Publish', function () {
    beforeEach(function (done) {
        done();
    });

    afterEach(function (done) {
        done();
    });

    describe('Valid Tokens To Authorize', function () {
        it('Should allow user authorized with token to publish a value.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = currentToken;
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
                var token = currentToken;
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomToken();
                        var variable = randomToken();
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
                var token = currentToken;
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomToken();
                        var variable = randomToken();
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
            var token = server.TOKEN_UBIDOTS;
            var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
            client.on("connect", function (connack) {
                assert.notEqual(connack, null);
                var dataSource = randomToken();
                var variable = randomToken();
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
            var token = server.TOKEN_UBIDOTS;
            var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
            client.on("connect", function (connack) {
                assert.notEqual(connack, null);
                var dataSource = randomToken();
                var variable = randomToken();
                var value = Math.random() * 100000;
                var userToken = randomToken();

                client.publish("/v1.6/thg/" + userToken + "/" + dataSource + "/" + variable + "/value/", value.toString(), {'qos': 1, 'retain': false}, function (error, response) {
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
                var token = currentToken;
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomToken();
                        var variable = randomToken();
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
                var token = currentToken;
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var topic = randomToken();
                        if (!server.isPublishValuePostUrl(topic) && !server.isPublishSubscribeValue(topic) &&
                                !server.isPublishSubscribeLastValue(topic)) {
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
                var token = currentToken;
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var value = Math.random() * 100000;
                        var topic = randomToken();
                        if (!server.isPublishValuePostUrl(topic) && !server.isPublishSubscribeValue(topic) &&
                                !server.isPublishSubscribeLastValue(topic)) {
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
                var token = currentToken;
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomToken();
                        var variable = randomToken();
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
                var token = currentToken;
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var dataSource = randomToken();
                        var variable = randomToken();
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
