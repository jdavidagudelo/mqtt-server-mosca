var validator = require("../Validator");
var sinon = require("sinon");
var redis = require('redis');
var request = require('request');
var server = require('../UbidotsMoscaServer.js');
var assert = require('chai').assert;
var mqtt = require("mqtt");
var tokens = [];
var tokensCount = 15;
var variables = {};
var variablesPerDataSource = 15;
var variablesId = {};
var ubidotsRedisClient = redis.createClient();
ubidotsRedisClient.select(server.redisSubscriberDatabase);
var error = 1e-9;
var invalidUnicodeArray = ['\t', '\n', '\x0b', '\x0c', '\r', '\x1c', '\x1d', '\x1e', '\x1f',
    ' ', '\x85', '\xa0', '\u1680', '\u180e', '\u2000', '\u2001', '\u2002',
    '\u2003', '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009',
    '\u200a', '\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '/',
    '?', '&', '=', '+', '$', '#', ','];
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

describe('Test Authorization Publish', function () {
    beforeEach(function (done) {
        tokens = [];
        variables = {};
        for (var i = 0; i < tokensCount; i++) {
            var token = randomToken();
            tokens.push(token);
        }
        sinon.stub(request, 'get', function (options, callback) {
            if (options.method === 'GET') {
                var uri = options.uri;
                var d = decodeURI(uri);
                var s = d.split("//")[1];
                if (s.split("/").length > 5) {
                    var dataSource = s.split("/")[4];
                    var variable = s.split("/")[5];
                    variablesId[variable] = randomToken();
                    if (variables[dataSource] === undefined) {
                        variables[dataSource] = [variable];
                    } else {
                        variables[dataSource].push(variable);
                    }
                }
                var token = uri.substring(uri.indexOf('=') + 1);
                var response = {};
                if (tokens.indexOf(token) < 0) {
                    response.statusCode = 403;
                } else {
                    response.statusCode = 200;
                }
                body = JSON.stringify({id: variablesId[variable]});
                callback(null, response, body);
            }
        });
        sinon.stub(request, 'post', function (options, callback) {
            if (options.method === 'POST') {
                var list = JSON.parse(options.body);
                for (var i = 0; i < list.length; i++) {
                    var variableId = variablesId[list[i].variable];
                    var redisTopic = 'rt/variables/' + variableId + '/last_value';
                    var value = list[i].value;
                    ubidotsRedisClient.publish(redisTopic, JSON.stringify({value: value}));
                }
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
        it('Should allow user authorized with token to subscribe to last value updates.', function (done) {
            this.timeout(0);
            var count = 0;
            for (var i = 0; i < tokensCount; i++) {
                var token = tokens[i];
                (function (token) {
                    var dataSource = randomUnicode();
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        var variablesPublish = [];
                        for (var i = 0; i < variablesPerDataSource; i++) {
                            var variable = randomUnicode();
                            var topic = "/v1.6/thg/" + token + "/" + dataSource + "/" + variable + "/value/lv";
                            var dict = {};
                            dict[topic] = 1;
                            var value = Math.random() * 100000;
                            var variablesCount = 0;
                            (function (variable, value) {
                                client.subscribe(dict, function (error, granted) {
                                    assert.equal(granted[0].qos, 1);
                                    assert.equal(error, null);
                                    variablesCount++;
                                    variablesPublish.push({value: value, variable: variable});
                                    if (variablesCount >= variablesPerDataSource) {
                                        var publisher = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                                        publisher.on("connect", function (connack) {
                                            assert.notEqual(connack, null);
                                            var json = JSON.stringify(variablesPublish);
                                            publisher.publish("/v1.6/thg/" + dataSource + "/values/post", json, {'qos': 1, 'retain': false},
                                                    function (error, response) {
                                                        assert.equal(response.qos, 1);
                                                        assert.equal(error, null);
                                                        publisher.end(true, function () {
                                                        });
                                                    });
                                        });
                                    }
                                });
                            })(variable, value);
                        }
                    });

                    client.on('message', function (topic, message, packet) {
                        var receivedValue = parseFloat(packet.payload.toString());
                        assert.equal(receivedValue === undefined, false);
                        count++;
                        if (count >= tokensCount * variablesPerDataSource) {
                            client.end(true, function () {
                                done();
                            });
                        }
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        count++;
                        if (count >= tokensCount * variablesPerDataSource) {

                            client.end(true, function () {
                                done();
                            });
                        }
                    });

                })(token);
            }
        });
    });


});
    