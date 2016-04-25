var mosca = require('mosca');
var util = require("util");
var mqtt = require("mqtt");
var pg = require('pg');
var redis = require("redis");
var request = require('request');
/**
 * Regex to test a valid publish or susbcribe value topic.
 * @type RegExp
 */
var publishSuscribeLastValueRegex = /\/v1.6\/thg\/[0-9a-z_]+\/[0-9a-z_]+\/[0-9a-z_]+\/value\/lv\/?/i;
/**
 * Regex to test a valid redis topic.
 * @type RegExp
 */
var regexRedisTopic = /rt\/variables\/[a-z0-9_]+\/last_value/i;
/**
 * Regex to test a valid publish value topic.
 * @type RegExp
 */
var publishValueRegex = /\/v1.6\/thg\/[0-9a-z_]+\/[0-9a-z_]+\/value\/post\/?/i;
/**
 * Regex to test a valid subscribe or publish value topic.
 * @type RegExp
 */
var publishSuscribeValueRegex = /\/v1.6\/thg\/[0-9a-z_]+\/[0-9a-z_]+\/[0-9a-z_]+\/value\/?/i;
/**
 * url of the broker.
 * @type String
 */
var mqttServerUrl = 'mqtt://localhost';
/**
 * URL Of the translate service.
 * @type String
 */
var translateUrl = 'http://translate.ubidots.com:9080/things/';
/**
 * ID of the redis database used to store information required by the broker.
 * @type Number
 */
var redisDatabase = 0;
/**
 * Redis client to store info required for the broker to redirect messages.
 * @type Redis Client
 */
var redisClient = redis.createClient();
/**
 * Redis client to the ubidots redis database, used to susbcribe to updates in values of variables.
 * @type redis client.
 */
var redisSubscriber = redis.createClient();
/**
 * Token used to publish data updated from the redis database of ubidots.
 * @type String
 */
var TOKEN_UBIDOTS = 'JGZKrp356i2e67zSU86wfYKG7Y7nbink';
/**
 * connection string to the ubidots database, used to get tokens and user's ids.
 * @type String
 */
var conString = "postgres://ubidots:ubidotsDevel@localhost/ubidots_devel1";
/**
 * token time to live used to validate authentication
 * @type Number
 */
var tokenSeconds = 21600;

redisClient.select(redisDatabase);

/**
 * The redis error handling function.
 * @param {type} err
 */
function redisError(err) {
    console.log("Error " + err);
}

redisClient.on("Error", redisError);

/**
 * Backed configuration. Mosca uses a redis database and uses database with id 12.
 * @type Module redis|Module redis
 */
var ascoltatore = {
    type: 'redis',
    redis: require('redis'),
    db: 12,
    port: 6379,
    return_buffers: true,
    host: "localhost"
};
/**
 * Mosca Settings.
 */
var moscaSettings = {
    port: 1883,
    backend: ascoltatore,
    persistence: {
        factory: mosca.persistence.Redis
    }
};

/**
 * Authennticates that a client is allowed to connect to the broker.
 * @param {type} client the client that wants to connect to the broker.
 * @param {type} username the username of the user that corresponds to
 * the token generated by ubidots for the user that is connecting to the broker.
 * @param {type} password does not matter.
 * @param {type} callback the callback receives an error and true or false indicating
 * if the user is authorized or not.
 * @returns {undefined} if the user is authorized the connection is successful, otherwise
 * the connection is terminated.
 */
var authenticate = function (client, username, password, callback) {
    pg.connect(conString, function (err, postgresClient, done) {
        if (err) {
            return console.error('Error fetching client from pool', err);
        }
        var now = new Date();
        var limit = new Date((now.getTime() - tokenSeconds * 1000));
        postgresClient.query("SELECT * from apikey_token where token = $1 and (expires = $2 or last_used >= $3);",
                [username, false, limit], function (err, result) {
            done();
            if (err) {
                return console.error('error running query', err);
            }
            if (username === TOKEN_UBIDOTS) {
                redisClient.set("user:" + client.id, username);
                callback(null, true);
            } else if (result.rows.length <= 0) {
                callback(null, false);
            } else {
                if (client !== undefined && client !== null && client.id !== 'retained') {
                    redisClient.set("user:" + client.id, username);
                    redisClient.sadd("user_tokens:" + result.rows[0]['user_id'], username);
                    redisClient.set("user_id:" + client.id, result.rows[0]['user_id']);
                    redisClient.sadd("tokens:" + username, client.id);
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            }
        });
    });
};

/**
 * This method validates if a client can subscribe to an specific topic.
 * @param {type} client the client that wishes to subscribe to a topic.
 * @param {type} topic the topic to which the client is subscribing to.
 * @param {type} callback a function that receives an error and true or false
 * indicating if the client is authorized or not to subscribe to the topic.
 * @returns {undefined} If the user is authorized to subscribe the event susbcribed
 * will be called and the client will receive a message specifying the information
 * of the subscription including the qos and will receive publications in the specified topic.
 * If the client it is not authorized, it will
 * receive an answer with a QOS of 128 and will not receive updates about the specified topic.
 */
function authorizeSubscribe(client, topic, callback) {
    if (isPublishSubscribeLastValue(topic)) {
        redisClient.get("user:" + client.id, function (err, reply) {
            if (validSubscribeLastValueToken(reply)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        });
    } else if (isPublishSubscribeValue(topic)) {
        redisClient.get("user:" + client.id, function (err, reply) {
            if (validSubscribeValueToken(reply)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        });
    } else if (isPublishValuePostUrl(topic)) {
        callback(null, false);
    } else {
        callback(null, false);
    }
}

/**
 * Authorizes a client to publish information to a topic.
 * @param {type} client the client that wishes to publish data.
 * @param {type} topic the topic to which the client wants to publish data.
 * @param {type} payload the data the client wants to publish.
 * @param {type} callback function that receives an error, and true or false
 * indicating if the client can publish or not about the specified topic.
 * @returns {undefined} If the client is authorized the data will be published
 * to the subscribers, otherwise the client will be automatically disconnected
 * by the broker.
 */
function authorizePublish(client, topic, payload, callback) {
    if (client !== undefined) {
        if (isPublishValuePostUrl(topic)) {
            redisClient.get("user:" + client.id, function (err, reply) {
                if (validPublishValuePostToken(reply)) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            });
        } else if (isPublishSubscribeLastValue(topic)) {
            redisClient.get("user:" + client.id, function (err, reply) {
                if (validPublishLastValueToken(reply)) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            });
        } else if (isPublishSubscribeValue(topic)) {
            redisClient.get("user:" + client.id, function (err, reply) {
                if (validPublishValueToken(reply)) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            });
        } else {
            callback(null, false);
        }
    } else {
        callback(null, false);
    }
}

var server = new mosca.Server(moscaSettings);
server.on('ready', setup);

/**
 * Clears a client's data from the redis database.
 * @param {type} client
 */
function clearClientData(client) {
    if (client !== null && client !== undefined) {
        redisClient.get("user:" + client.id, function (err, username) {
            redisClient.del("user:" + client.id);
            redisClient.get("user_id:" + client.id, function (err, user_id) {
                redisClient.del("user_id:" + client.id);
                redisClient.srem("tokens:" + username, client.id);
                redisClient.scard("tokens:" + username, function (error, result) {
                    removeRedisSubscribeInfo(client, username, result === 0);
                    if (result === 0) {
                        redisClient.srem("user_tokens:" + user_id, username);
                    }
                });
            });

        });
    }
}

server.on('clientDisconnected', clearClientData);

/**
 * Removes any information stored in redis about a client that is just disconnected from the broker.
 * @param {type} client the client.
 * @param {type} username the token of the client.
 * @param {type} canRemoveUsername specifies if there is no more clients using the same token.
 * @returns {undefined} removes the information that can be eliminated from redis.
 */
function removeRedisSubscribeInfo(client, username, canRemoveUsername) {
    redisClient.smembers("topic_clients_redis:" + client.id, function (err, variables) {
        for (var i in variables) {
            var variableId = variables[i];
            if (canRemoveUsername) {
                redisClient.del("topic:" + variableId + ":" + username);
                redisClient.srem("tokens_redis:" + variableId, username);
            }
            redisClient.srem("topic_clients_redis:" + client.id, variableId);
            redisClient.srem("topics_redis:" + variableId, client.id);
        }
        for (var i in variables) {
            var variableId = variables[i];
            redisClient.scard("topics_redis:" + variableId, function (err, result) {
                if (result === 0 && canRemoveUsername) {
                    redisSubscriber.unsubscribe(getRedisTopicLastValue(variableId));
                }
            });
        }
    });
}

/**
 * Function executed when a client connects to the server. 
 * Does nothing by defaut.
 * @param {type} client the client connected to the server.
 */
function clientConnected(client) {

}

server.on('clientConnected', clientConnected);

/**
 * Subscribes a client to the redis database, to listen when last value is updated.
 * @param {type} topic The topic to which the client wants to subscribe to.
 * It should be of the form: /v1.6/thg/token/datasource/variable/value/lv or /v1.6/thg/token/datasource/variable/value
 * where token is the user's token, variable the variable's label, and the datasource's label.
 * @param {type} client the client that subscribed to the specified topic.
 */
function subscribeClient(topic, client) {
    var variableId = 'xxx';
    redisClient.get("user:" + client.id, function (err, token) {
        subscribeToRedisLastValue(variableId, token, client.id);
        redisClient.set("topic:" + variableId + ":" + token, topic);
    });
}

server.on('subscribed', subscribeClient);

/**
 * Publish the result of a message published to ubidots. It does something only when the topic
 * corresponds to the post value topic.
 * @param {type} packet contains the topic and the payload.
 * @param {type} client the client that published the value.
 */
function publishToUbidots(packet, client) {
    if (isPublishValuePostUrl(packet.topic)) {
        if (client !== undefined) {
            redisClient.get("user:" + client.id, function (err, reply) {
                if (validPublishValuePostToken(reply)) {
                    publishValue(packet, reply);
                }
            });
        }
    }
}

server.on('published', publishToUbidots);
server.authenticate = authenticate;
server.authorizePublish = authorizePublish;
server.authorizeSubscribe = authorizeSubscribe;
/**
 * Fired when the mqtt server is ready.
 * @returns {undefined}
 */
function setup() {
}
/**
 * Indicates if the user with the specific token can
 * publish to the value post topic.
 * @param {type} token the token of the user.
 * @returns {Boolean} true if the user can publish a value, false otherwise.
 */
function validPublishValuePostToken(token) {
    return token !== null && token !== undefined;
}
/**
 * Indicates if the user with the specified token can subscribe to the
 * get last value topic.
 * @param {type} token the token of the user.
 * @returns {Boolean} true if the user can subscribe to the to the last value
 * topic, false otherwise.
 */
function validSubscribeLastValueToken(token) {
    return token !== null && token !== undefined;
}
/**
 * Test if the specified token is the ubidots token.
 * @param {type} token token to validate.
 * @returns {Boolean} true if the token corresponds to the 
 * default token of ubidots to publish values.
 */
function validPublishLastValueToken(token) {
    return token !== null && token !== undefined && token === TOKEN_UBIDOTS;
}

/**
 * 
 * @param {type} token
 * @returns {Boolean}
 */
function validSubscribeValueToken(token) {
    return token !== null && token !== undefined;
}
/**
 * 
 * @param {type} token
 * @returns {Boolean}
 */
function validPublishValueToken(token) {
    return token !== null && token !== undefined && token === TOKEN_UBIDOTS;
}
/**
 * Determines if the topic corresponds to the subscribe or publish the last value.
 * @param {type} topic the topic to be tested.
 * @returns {Boolean} true if the topic is of the form: /v1.6/thg/token/datasource/variable/value/lv where
 * token, datasource and variable correspond to the user's token, the datasource's label and the variable's label.
 */
function isPublishSubscribeLastValue(topic) {
    var r = publishSuscribeLastValueRegex.exec(topic);
    if (r === null || r === undefined) {
        return false;
    }
    return r[0] === r['input'];
}
/**
 * Determines if topic corresponds to the subscribe or publish value topic.
 * @param {type} topic topic to be tested.
 * @returns {Boolean} true if the topic is of the form: /v1.6/thg/token/datasource/variable/value where 
 * token, datasource and variable correspond to the user's token, the datasource's label and the variable's label.
 */
function isPublishSubscribeValue(topic) {
    var r = publishSuscribeValueRegex.exec(topic);
    if (r === null || r === undefined) {
        return false;
    }
    return r[0] === r['input'];
}
/**
 * Determines if the topic corresponds to the publish value topic.
 * @param {type} topic the topic to be tested.
 * @returns {Boolean} true if the topic if of the form: /v1.6/thg/datasource/variable/value/post where
 * datasource and variable correspond to the datasources's label and the variable's label.
 */
function isPublishValuePostUrl(topic) {
    var r = publishValueRegex.exec(topic);
    if (r === null || r === undefined) {
        return false;
    }
    return r[0] === r['input'];
}
/**
 * Send a value to the translate service using a post web service.
 * @param {type} data data is a dictionary with the dataSource, variable, token and value keys.
 * dataSource: the label of the datasource.
 * variable: the label of the variable.
 * token: the token of the user.
 * value: the value to be posted to ubidots.
 */
function sendDataToTranslate(data) {
    var value = JSON.stringify({
        'value': parseFloat(data.value)
    });
    var options = {
        method: 'POST',
        uri: translateUrl + data.dataSource + '/' + data.variable + '/values?token=' + data.token,
        body: value,
        headers: {
            'content-type': 'application/json'
        }
    };
    request(options, function (error, response, body) {
        if (error) {
        } else {
        }
    });
}
/**
 * Send a value to the translate service.
 * @param {type} packet the packet published. Includes the topic and the payload.
 * @param {type} token the token of the user.
 */
function publishValue(packet, token) {
    var x = packet.topic.toString().split("/");
    var labelDataSource = x[3];
    var labelVariable = x[4];
    var value = packet.payload.toString();
    var data = {dataSource: labelDataSource, variable: labelVariable, value: value, token: token};
    sendDataToTranslate(data);
}

/**
 * Gets the topic to which to subscribe to the redis of ubidots
 * in order to get updates about the specified variable.
 * @param {type} variableId id of the variable to subscribe to.
 * @returns {String}the redis topic to subscribe to.
 */
function getRedisTopicLastValue(variableId) {
    var topic = 'rt/variables/' + variableId + '/last_value';
    return topic;
}

/**
 * Stores subscriber info to redis in order to send
 * updates to it.
 * @param {type} variableId id of the variable to subscribe to in redis.
 * @param {type} token the token of the user subscribing to the channel.
 * @param {type} clientId the id of the mosca client subscribing to a topic.
 * @returns {undefined} stores in redis the information required to redirect the
 * ubidots redis messages to the subscribers of this broker.
 */
function subscribeToRedisLastValue(variableId, token, clientId) {
    redisClient.sadd("tokens_redis:" + variableId, token);
    redisClient.sadd("topics_redis:" + variableId, clientId);
    redisClient.sadd("topic_clients_redis:" + clientId, variableId);
    redisClient.get("topic:" + variableId + ":" + token, function (error, result) {
        if (result === null || result === undefined) {
            var topic = getRedisTopicLastValue(variableId);
            redisSubscriber.subscribe(topic);
        }
    });
}

/**
 * Publish message published by redis to the broker subscribers.
 * @param {type} channel the topic in redis.
 * @param {type} message the message payload.
 */
function receiveRedisMessage(channel, message) {
    var r = regexRedisTopic.exec(channel);
    if (r !== null && r[0] === r['input']) {
        var split = channel.split("/");
        var variableId = split[2];
        redisClient.smembers('tokens_redis:' + variableId, function (error, tokens) {
            for (var i in tokens) {
                var token = tokens[i];
                redisClient.get('topic:' + variableId + ":" + token, function (error, topic) {
                    if (isPublishSubscribeValue(topic)) {
                        publishLastValue(topic, message);
                    } else if (isPublishSubscribeLastValue(topic)) {
                        var data = JSON.parse(message.toString());
                        var value = data.value;
                        if (value !== null && value !== undefined) {
                            publishLastValue(topic, value.toString());
                        }
                    }
                });
            }
        });
    }
}

redisSubscriber.on("message", receiveRedisMessage);
/**
 * Broadcasts value received from redis to all subscribers of the specified topic.
 * @param {type} topic the topic to publish the value to.
 * @param {type} value the value to publish to the subscribers. It could be
 * a JSON document or a single double value.
 * @returns {undefined}
 */
function publishLastValue(topic, value) {
    var client = mqtt.connect(mqttServerUrl, {username: TOKEN_UBIDOTS, password: ""});
    client.publish(topic, value, {'qos': 1, 'retain': false}, function (error, response) {
        console.log(error);
        console.log(response);
        client.end();
    });
}
/**
 * Exporting functions to perform unit testing.
 */
exports.isPublishSubscribeLastValue = isPublishSubscribeLastValue;
exports.isPublishSubscribeValue = isPublishSubscribeValue;
exports.isPublishValuePostUrl = isPublishValuePostUrl;
exports.authenticate = authenticate;
exports.authorizePublish = authorizePublish;
exports.authorizeSubscribe = authorizeSubscribe;
exports.publishLastValue = publishLastValue;
exports.publishValue = publishValue;
exports.removeRedisSubscribeInfo = removeRedisSubscribeInfo;
exports.sendDataToTranslate = sendDataToTranslate;
exports.subscribeToRedisLastValue = subscribeToRedisLastValue;
exports.validPublishValueToken = validPublishValueToken;
exports.validPublishLastValueToken = validPublishLastValueToken;
exports.validPublishValuePostToken = validPublishValuePostToken;
exports.validSubscribeLastValueToken = validSubscribeLastValueToken;
exports.validSubscribeValueToken = validSubscribeValueToken;
exports.TOKEN_UBIDOTS = TOKEN_UBIDOTS;
