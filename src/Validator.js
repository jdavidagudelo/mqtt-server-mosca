/**
 * Token used to publish data updated from the redis database of ubidots.
 * @type String
 */
var TOKEN_UBIDOTS = 'JGZKrp356i2e67zSU86wfYKG7Y7nbink';
/**
 * Regex to test a valid publish or susbcribe value topic.
 * @type RegExp
 */
//var publishSuscribeLastValueRegex = /\/v1.6\/thg\/[0-9a-z_]+\/[0-9a-z_]+\/[0-9a-z_]+\/value\/lv\/?/i;
var publishSuscribeLastValueRegex = /\/v1.6\/thg\/.+\/.+\/.+\/value\/lv/;
/**
 * Regex to test a valid redis topic.
 * @type RegExp
 */
var regexRedisTopic = /rt\/variables\/[a-z0-9_]+\/last_value/i;
/**
 * Regex to publish a collection of values from a datasource.
 * @type RegExp
 */
var publishCollectionValuesRegex = /\/v1.6\/thg\/.+\/values\/post/;
/**
 * Regex to test a valid publish value topic.
 * @type RegExp
 */
//var publishValueRegex = /\/v1.6\/thg\/[0-9a-z_]+\/[0-9a-z_]+\/value\/post\/?/i;
var publishValueRegex = /\/v1.6\/thg\/.+\/.+\/value\/post/;

/**
 * Regex to test a valid subscribe or publish value topic.
 * @type RegExp
 */
//var publishSuscribeValueRegex = /\/v1.6\/thg\/[0-9a-z_]+\/[0-9a-z_]+\/[0-9a-z_]+\/value\/?/i;
var publishSuscribeValueRegex = /\/v1.6\/thg\/.+\/.+\/.+\/value/;
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
function validPublishCollectionPostToken(token) {
    return token !== null && token !== undefined;
}
/**
 * Determines if the corresponds to the post several variables from a datasource topic.
 * @param {type} topic the topic to be tested.
 * @returns {Boolean} true if the topic is a publish values from datasource topic, false otherwise.
 */
function isPublishCollectionValues(topic){
    
    var r = publishCollectionValuesRegex.exec(topic);
    if (r === null || r === undefined) {
        return false;
    }
    return r[0] === r['input'];
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
 * Tests if a string corresponds to a valid redis topic.
 * @param {type} topic the topic to be tested.
 * @returns {Boolean} true if the topic is a valid redis channel, false otherwise.
 */
function isValidRedisTopic(topic){
    var r = regexRedisTopic.exec(topic);
    if (r === null || r === undefined) {
        return false;
    }
    return r[0] === r['input'];
}

exports.isPublishSubscribeLastValue = isPublishSubscribeLastValue;
exports.TOKEN_UBIDOTS = TOKEN_UBIDOTS;
exports.validPublishLastValueToken = validPublishLastValueToken;
exports.validPublishValuePostToken = validPublishValuePostToken;
exports.isPublishSubscribeValue = isPublishSubscribeValue;
exports.isPublishValuePostUrl = isPublishValuePostUrl;
exports.validPublishValueToken = validPublishValueToken;
exports.validSubscribeLastValueToken = validSubscribeLastValueToken;
exports.validSubscribeValueToken = validSubscribeValueToken;
exports.isValidRedisTopic = isValidRedisTopic;
exports.isPublishCollectionValues = isPublishCollectionValues;
exports.validPublishCollectionPostToken = validPublishCollectionPostToken;