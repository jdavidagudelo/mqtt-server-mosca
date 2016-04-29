var server = require('../UbidotsMoscaServer.js');
var assert = require('chai').assert;
var request = require('request');
var sinon = require('sinon');
var testsCount = 100;
var mqtt = require("mqtt");
var tokens = [];
var tokensCount = 100;
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

function getInvalidToken() {
    var token = randomToken();
    while (tokens.indexOf(token) >= 0) {
        token = randomToken();
    }
    return token;
}

describe('Test Authentication', function () {
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
                callback(null, response, null);
            }
        });
        done();
    });
    afterEach(function (done) {
        request.get.restore();
        done();
    });

    describe('Valid Tokens To Authenticate', function () {
        it('Should Authenticate Succesfully Existing Tokens.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(null, connack);
                        client.end(true, function () {
                            count++;
                            if (count >= tokensCount) {
                                done();
                            }
                        });
                    });
                    client.on("error", function (error) {
                        assert.equal(error, null);
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
    describe('Invalid Tokens To Authenticate', function () {
        it('Should not allow null tokens.', function (done) {
            this.timeout(0);
            var client = mqtt.connect('mqtt://localhost', {username: null, password: ""});
            client.on("connect", function (connack) {
                assert.equal(null, connack);
                client.end(true, function () {
                    done();
                });
            });
            client.on("error", function (error) {
                assert.notEqual(error, null);
                client.end(true, function () {
                    done();
                });
            });
        });
        it('Should Not Allow Succesful Authentication To Non Existing Tokens.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < testsCount; i++) {
                var token = getInvalidToken();
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.equal(null, connack);
                        client.end(true, function () {
                            count++;
                            if (count >= testsCount) {
                                done();
                            }
                        });
                    });
                    client.on("error", function (error) {
                        assert.notEqual(error, null);
                        client.end(true, function () {
                            count++;
                            if (count >= testsCount) {
                                done();
                            }
                        });
                    });
                })(token);
            }
        });
    });
});
