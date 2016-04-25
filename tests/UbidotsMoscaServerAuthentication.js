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
var tokensAuthenticated = [];
var invalidTestsCount = testsCount;
var invalidDone = false;
var validTokensDone = false;

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
        client.end(true, function () {
        });
        done();
    }
}

function removeToken(result, client, done) {
    tokens.pop(result);
    if (tokens.length === 0) {
        tokensString = [];
        client.end(true, function () {
        });
        done();
    }
}

describe('Test Authentication', function () {
    beforeEach(function (done) {
        var client = new pg.Client(conString);
        client.connect(function (err) {
            if (err) {
                return console.error('could not connect to postgres', err);
            }

            client.query("delete from apikey_token where id > 39;",
                    [],
                    function (err, result) {
                        if (err) {
                            return console.error('error running query', err);
                        }
                        for (var i = 0; i < tokensCount; i++) {
                            var userId = 1;
                            var token = randomToken();
                            (function (token) {
                                client.query("insert into apikey_token(user_id, token, last_used, expires, name) values($1, $2, $3, $4, $5) RETURNING id;",
                                        [userId, token, new Date(), true, "newName"],
                                        function (err, result) {
                                            if (err) {
                                                return console.error('error running query', err);
                                            }
                                            tokensString.push(token);
                                            updateTokens(result, tokensCount, client, done);
                                        });
                            })(token);
                        }
                    });
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
    function doneTokensValidation(tokenString, done) {
        tokensAuthenticated.push(tokenString);
        if (tokensAuthenticated.length === tokensCount && !validTokensDone) {
            tokensAuthenticated = [];
            validTokensDone = true;
            done();
        }
    }
    describe('Valid Tokens To Authenticate', function () {
        it('Should Authenticate Succesfully Existing Tokens.', function (done) {
            validTokensDone = false;
            for (var i = 0; i < tokensString.length; i++) {
                var token = tokensString[i];
                (function (token) {
                    var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                    client.on("connect", function (connack) {
                        assert.notEqual(connack, null);
                        client.end(false, function () {
                            doneTokensValidation(token, done);
                        });
                    });
                    client.on("error", function (error) {
                        assert.equal(null, error);
                        client.end(true, function () {
                            doneTokensValidation(token, done);
                        });
                    });
                })(token);
            }
        });
    });
    function doneInvalidTokens(token, done) {
        invalidTokens.push(token);
        if (invalidTokens.length === invalidTestsCount && !invalidDone) {
            invalidTokens = [];
            invalidDone = true;
            done();
        }
    }
    describe('Invalid Tokens To Authenticate', function () {
        it('Should not allow null tokens.', function (done) {
            var token = null;
            var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
            var over = false;
            client.on("connect", function (connack) {
                assert.equal(null, connack);
                if (!over) {
                    over = true;
                    done();
                }
            });
            client.on("error", function (error) {
                assert.notEqual(error, null);
                if (!over) {
                    over = true;
                    done();
                }
            });

        });
        it('Should Not Allow Succesful Authentication To Non Existing Tokens.', function (done) {
            invalidDone = false;
            invalidTestsCount = testsCount;
            for (var i = 0; i < testsCount; i++) {
                var token = randomToken();
                (function (token) {
                    if (tokensString.indexOf(token) < 0) {
                        var client = mqtt.connect('mqtt://localhost', {username: token, password: ""});
                        client.on("connect", function (connack) {
                            assert.equal(null, connack);
                            client.end(true, function () {
                                doneInvalidTokens(token, done);
                            });
                        });
                        client.on("error", function (error) {
                            assert.notEqual(error, null);
                            client.end(true, function () {
                                doneInvalidTokens(token, done);
                            });
                        });
                    } else {
                        invalidTestsCount--;
                    }
                })(token);
            }
        });
    });
});
