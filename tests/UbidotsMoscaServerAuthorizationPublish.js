var server = require("../UbidotsMoscaServer");
var assert = require('chai').assert;
var pg = require('pg');
var testsCount = 10;
var mqtt = require("mqtt");
var conString = "postgres://ubidots:ubidotsDevel@localhost/ubidots_devel1";
var tokens = [];
var tokensCount = 20;
var tokensString = [];
var invalidTokens = [];
var tokensAuthorizedPublish = [];
var invalidTestsCount = testsCount;
var validTokensDone = false;
var invalidTokensDone = false;

String.prototype.repeat = function (num)
{
    return new Array(num + 1).join(this);
};
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

describe('Test Authorization', function () {
    beforeEach(function (done) {
        var client = new pg.Client(conString);
        client.connect(function (err) {
            if (err) {
                return console.error('could not connect to postgres', err);
            }
            for (var i = 0; i < tokensCount; i++) {
                var userId = 1;
                var token = randomToken();
                client.query("insert into apikey_token(user_id, token, last_used, expires, name) values($1, $2, $3, $4, $5) RETURNING id;",
                        [userId, token, new Date(), true, "newName"],
                        function (err, result) {
                            if (err) {
                                return console.error('error running query', err);
                            }
                            tokensString.push(token);
                            updateTokens(result, tokensCount, client, done);
                        });
            }
        });

    });

    afterEach(function (done) {
        var client = new pg.Client(conString);
        client.connect(function (err) {
            if (err) {
                return console.error('could not connect to postgres', err);
            }
            for (var i = 0; i < tokensCount; i++) {
                client.query("delete from apikey_token where id = $1;",
                        [tokens[i].rows[0].id],
                        function (err, result) {
                            if (err) {
                                return console.error('error running query', err);
                            }
                            removeToken(result, client, done);
                        });
            }
        });
    });

    function doneTokensAuthorization(tokenString, done) {
        tokensAuthorizedPublish.push(tokenString);
        if (tokensAuthorizedPublish.length === tokensCount && !validTokensDone) {
            tokensAuthorizedPublish = [];
            validTokensDone = true;
            done();
        }
    }
    describe('Valid Tokens To Authorize', function () {
        it('Should allow user authorized with token to publish a value.', function (done) {
            validTokensDone = false;
            for (var i = 0; i < tokensString.length; i++) {
                var token = tokensString[i];
                var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                client.on("connect", function (connack) {
                    assert.notEqual(connack, null);
                    var dataSource = randomToken();
                    var variable = randomToken();
                    var value = Math.random() * 100000;
                    client.publish("/v1.6/thg/" + dataSource + "/" + variable + "/value/post", value.toString(), {'qos': 1, 'retain': false}, function (error, response) {
                        assert.equal(response.qos, 1);
                        assert.equal(error, null);
                        doneTokensAuthorization(token, done);
                        client.end();

                    });
                });
                client.on("error", function (error) {
                    assert.equal(null, error);
                    doneTokensAuthorization(token, done);
                });
            }
        });
        it('Should allow ubidots default user to publish a last value.', function (done) {
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
                    client.end();
                    done();

                });
            });
            client.on("error", function (error) {
                assert.equal(null, error);
                done();
            });

        });
        it('Should allow ubidots default user to publish a value.', function (done) {
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
                    client.end();
                    done();

                });
            });
            client.on("error", function (error) {
                assert.equal(null, error);
                done();
            });

        });
    });
    describe('Invalid Token To Authorize', function () {
        it('Should not allow user different to the ubidots default.', function (done) {
            invalidTokensDone = false;
            for (var i = 0; i < tokensString.length; i++) {
                var token = tokensString[i];
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
                        client.end();
                        done();

                    });
                });
                client.on("close", function(){
                   assert.equal(0, 0);
                   done();
                });
                client.on("error", function (error) {
                    assert.equal(null, error);
                    done();
                });
            }
        });
    });
});
