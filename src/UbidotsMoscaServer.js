var mosca = require('mosca');
var mqtt = require("mqtt");
var redis = require("redis");
var request = require('request');
var validator = require('./Validator');

/**
 * url of the broker.
 * @type String
 */
var mqttServerUrl = 'mqtt://localhost';
/**
 * URL Of the translate service.
 * @type String
 */
var translateUrl = 'http://localhost:8087/api/v1.6/thg/';

var ubidotsDatasourcesUrl = 'http://localhost:8087/api/v1.6/datasources/';
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
var redisSubscriberDatabase = 0;
redisClient.select(redisDatabase);
redisSubscriber.select(redisSubscriberDatabase);

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
function validateUser(username, client, authenticated, callback) {
    if (username === validator.TOKEN_UBIDOTS) {
        redisClient.set("user:" + client.id, username);
        callback(null, true);
    } else if (!authenticated) {
        callback(null, false);
    } else {
        if (client !== undefined && client !== null && client.id !== 'retained') {
            //user:<clientId> contains the token of the client
            redisClient.set("user:" + client.id, username);
            //tokens:<token> set of all the clients with a specified token. 
            redisClient.sadd("tokens:" + username, client.id);
            callback(null, true);
        } else {
            callback(null, false);
        }
    }
}
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
    var uri = encodeURI(ubidotsDatasourcesUrl + "?token=" + username);
    var options = {
        method: 'GET',
        uri: uri
    };
    request.get(options, function (error, response, body) {
        var authenticated = response !== null && response !== undefined && response.statusCode === 200;
        validateUser(username, client, authenticated, callback);
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
    if (validator.isPublishSubscribeLastValue(topic)) {
        redisClient.get("user:" + client.id, function (err, reply) {
            if (validator.validSubscribeLastValueToken(reply)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        });
    } else if (validator.isPublishSubscribeValue(topic)) {
        redisClient.get("user:" + client.id, function (err, reply) {
            if (validator.validSubscribeValueToken(reply)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        });
    } else if (validator.isPublishValuePostUrl(topic)) {
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
        if (validator.isPublishValuePostUrl(topic)) {
            redisClient.get("user:" + client.id, function (err, reply) {
                if (validator.validPublishValuePostToken(reply)) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            });
        } else if (validator.isPublishSubscribeLastValue(topic)) {
            redisClient.get("user:" + client.id, function (err, reply) {
                if (validator.validPublishLastValueToken(reply)) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            });
        } else if (validator.isPublishSubscribeValue(topic)) {
            redisClient.get("user:" + client.id, function (err, reply) {
                if (validator.validPublishValueToken(reply)) {
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
            redisClient.srem("tokens:" + username, client.id);
            redisClient.scard("tokens:" + username, function (error, result) {
                removeRedisSubscribeInfo(client, username, result === 0);
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
    var x = topic.toString().split("/");
    var userToken = x[3];
    var labelDataSource = x[4];
    var labelVariable = x[5];
    var uri = encodeURI(translateUrl + labelDataSource + '/' + labelVariable + '/values?token=' + userToken);
    var options = {
        method: 'GET',
        uri: uri
    };
    request.get(options, function (error, response, body) {
        if (response !== undefined && response !== null && response.statusCode === 200) {
            var json = JSON.parse(body);
            var variableId = json.id;
            if (variableId !== null && variableId !== undefined) {
                redisClient.get("user:" + client.id, function (err, token) {
                    if (token !== null) {
                        subscribeToRedisLastValue(variableId, token, client.id);
                        //topic:<variableId>:<token> contains the topic with the specified variableId and token.
                        redisClient.set("topic:" + variableId + ":" + token, topic);
                    }
                });
            }
        }
    });
}

server.on('subscribed', subscribeClient);

/**
 * Publish the result of a message published to ubidots. It does something only when the topic
 * corresponds to the post value topic.
 * @param {type} packet contains the topic and the payload.
 * @param {type} client the client that published the value.
 * @param {type} callback callback to indicate the publication is succesful.
 */
function publishToUbidots(packet, client, callback) {
    if (validator.isPublishValuePostUrl(packet.topic)) {
        if (client !== undefined) {
            redisClient.get("user:" + client.id, function (err, reply) {
                if (validator.validPublishValuePostToken(reply)) {
                    publishValue(packet, reply, callback);
                }
            });
        }
    } else {
        if (callback !== undefined && callback !== null) {
            callback(null);
        }
    }
}

/**
 * This way the client must wait until the ubidots server replies.
 */
//server.published = publishToUbidots;

/**
 * This way the client requests, receives ack and the processing is performed
 * asynch.
 */
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
 * Send a value to the translate service using a post web service.
 * @param {type} data data is a dictionary with the dataSource, variable, token and value keys.
 * dataSource: the label of the datasource.
 * variable: the label of the variable.
 * token: the token of the user.
 * value: the value to be posted to ubidots.
 * @param {type} callback callback to indicate the publication is succesful.
 */
function sendDataToTranslate(data, callback) {
    var uri = encodeURI(translateUrl + data.dataSource + '/' + data.variable + '/values?token=' + data.token);
    var options = {
        method: 'POST',
        uri: uri,
        body: data.value,
        headers: {
            'content-type': 'application/json'
        }
    };

    request.post(options, function (error, response, body) {
        if (callback !== undefined && callback !== null) {
            callback();
        }
    });
}
/**
 * Send a value to the translate service.
 * @param {type} packet the packet published. Includes the topic and the payload.
 * @param {type} token the token of the user.
 * @param {type} callback callback to indicate the publication is succesful.
 */
function publishValue(packet, token, callback) {
    var x = packet.topic.toString().split("/");
    var labelDataSource = x[3];
    var labelVariable = x[4];
    var value = packet.payload.toString();
    var data = {dataSource: labelDataSource, variable: labelVariable, value: value, token: token};
    sendDataToTranslate(data, callback);
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
    if (validator.isValidRedisTopic(channel)) {
        var split = channel.split("/");
        var variableId = split[2];
        redisClient.smembers('tokens_redis:' + variableId, function (error, tokens) {
            for (var i in tokens) {
                var token = tokens[i];
                redisClient.get('topic:' + variableId + ":" + token, function (error, topic) {
                    if (validator.isPublishSubscribeValue(topic)) {
                        publishLastValue(topic, message);
                    } else if (validator.isPublishSubscribeLastValue(topic)) {
                        var data = JSON.parse(message);
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
    var client = mqtt.connect(mqttServerUrl, {username: validator.TOKEN_UBIDOTS, password: ""});
    client.publish(topic, value, {'qos': 1, 'retain': false}, function (error, response) {
        client.end();
    });
    client.on("error", function (error) {
    });
}

exports.ubidotsDatasourcesUrl = ubidotsDatasourcesUrl;