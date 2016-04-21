var mosca = require('mosca')
var pg = require('pg');
var redis = require("redis");
var request = require('request');
var redisDatabase = 0;
var redisClient = redis.createClient();
const TOKEN_UBIDOTS = 'JGZKrp356i2e67zSU86wfYKG7Y7nbink';
var conString = "postgres://ubidots:ubidotsDevel@localhost/ubidots_devel1";
var tokenSeconds = 21600;

redisClient.select(redisDatabase);
redisClient.on("Error", function (err) {
    console.log("Error " + err);
});

var ascoltatore = {
  type: 'redis',
  redis: require('redis'),
  db: 12,
  port: 6379,
  return_buffers: true,
  host: "localhost"
};

var moscaSettings = {
  port: 1883,
  backend: ascoltatore,
  persistence: {
    factory: mosca.persistence.Redis
  }
};

var authenticate = function(client, username, password, callback) {
/*  if(true){
    redisClient.set("user:"+client.id, "NRmyIOPJGkmXOc0Ah93PA2SylvNysZ", redis.print);
    callback(null, true);
    return;
  }*/
  pg.connect(conString, function(err, postgresClient, done) {
    if(err) {
      return console.error('Error fetching client from pool', err);
    }
    var now = new Date();
    var limit = new Date((now.getTime() - tokenSeconds*1000));
    postgresClient.query("SELECT * from apikey_token where token = $1 and (expires = $2 or last_used >= $3);",
    [username, false, limit], function(err, result) {
      //call `done()` to release the client back to the pool
      done();
      if(err) {
        return console.error('error running query', err);
      }
      if(username == TOKEN_UBIDOTS){
        redisClient.set("user:"+client.id, username, redis.print);
        callback(null, true);
      }
      else if(result.rows.length <= 0){
        callback(null, false);
      }
      else{
        if(client != undefined && client != null && client.id != 'retained'){
          redisClient.set("user:"+client.id, username, redis.print);
          redisClient.sadd("user_tokens:"+result.rows[0]['user_id'], username, redis.print);
          redisClient.set("user_id:"+client.id, result.rows[0]['user_id'], redis.print);
          redisClient.sadd("tokens:"+username, client.id, redis.print);
          callback(null, true);
        }
        else{
            callback(null, false);
        }
      }
    });
  });
}

function authorizeSubscribe(client, topic, callback){
  if(isPublishSuscribeLastValue(topic)){
      redisClient.get("user:"+client.id, function(err, reply) {
          if(validSubscribeLastValueToken(reply)){
            callback(null, true);
          }
          else{
            callback(null, false);
          }
        });
  }
  else if(isPublishSuscribeValue(topic)){
      redisClient.get("user:"+client.id, function(err, reply) {
          if(validSubscribeValueToken(reply)){
            callback(null, true);
          }
          else{
            callback(null, false);
          }
        });
  }
  else if(isPublishValuePostUrl(topic)){
    callback(null, false);
  }
  else{
    callback(null, false);
  }
}

function authorizePublish(client, topic, payload, callback){
  if(client != undefined){
    if(isPublishValuePostUrl(topic)){
      redisClient.get("user:"+client.id, function(err, reply) {
          if(validPublishValuePostToken(reply)){
            callback(null, true);
          }
          else{
            callback(null, false);
          }
        });
    }
    else if(isPublishSuscribeLastValue(topic)){
      redisClient.get("user:"+client.id, function(err, reply) {
          if(validPublishLastValueToken(reply)){
            callback(null, true);
          }
          else{
            callback(null, false);
          }
      });
    }
    else if(isPublishSuscribeValue(topic)){
      redisClient.get("user:"+client.id, function(err, reply) {
          if(validPublishValueToken(reply)){
            callback(null, true);
          }
          else{
            callback(null, false);
          }
      });
    }
    else{
      callback(null, false);
    }
  }
  else{
    callback(null, false);
  }
}

var server = new mosca.Server(moscaSettings);
server.on('ready', setup);
server.on('clientDisconnected', function(client){
  if(client != null && client != undefined){
    redisClient.get("user:"+client.id, function(err, username) {
      redisClient.del("user:"+client.id);
      redisClient.get("user_id:"+client.id, function(err, user_id) {
        redisClient.del("user_id:"+client.id);
        redisClient.srem("tokens:"+username, client.id);
        redisClient.scard("tokens:"+username, function(error, result){
          if(result == 0){
            redisClient.srem("user_tokens:"+user_id, username);
          }
        });
        });
      });
  }
});

server.on('clientConnected', function(client) {
});

// fired when a message is received
server.on('subscribed', function(a, b){
  console.log(a);
});

server.on('published', function(packet, client) {
  if(isPublishValuePostUrl(packet.topic)){
    if(client != undefined){
      redisClient.get("user:"+client.id, function(err, reply) {
          if(validPublishValuePostToken(reply)){
            publishValue(packet, reply);
          }
        });
      }
    }
});
server.authenticate = authenticate;
server.authorizePublish = authorizePublish;
server.authorizeSubscribe = authorizeSubscribe;
// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running');
}

function validPublishValuePostToken(token){
  return token != null && token != undefined;
}
function validSubscribeLastValueToken(token){
  return token != null && token != undefined;
}
function validPublishLastValueToken(token){
  return token != null && token != undefined && token == TOKEN_UBIDOTS;
}
function validSubscribeValueToken(token){
  return token != null && token != undefined;
}
function validPublishValueToken(token){
  return token != null && token != undefined && token == TOKEN_UBIDOTS;
}
function isPublishSuscribeLastValue(topic){
  var publishSuscribeLastValueRegex = /\/v1.6\/thg\/[0-9a-z_]+\/[0-9a-z_]+\/[0-9a-z_]+\/value\/lv\/?/gi;
  var r = publishSuscribeLastValueRegex.exec(topic);
  if(r == null || r == undefined){
    return false;
  }
  return r[0] == r['input'];
}
function isPublishSuscribeValue(topic){
  var publishSuscribeValueRegex = /\/v1.6\/thg\/[0-9a-z_]+\/[0-9a-z_]+\/[0-9a-z_]+\/value\/?/gi;
  var r = publishSuscribeValueRegex.exec(topic);
  if(r == null || r == undefined){
    return false;
  }
  return r[0] == r['input'];
}
function isPublishValuePostUrl(topic){
  var publishValueRegex = /\/v1.6\/thg\/[0-9a-z_]+\/[0-9a-z_]+\/value\/post\/?/gi;
  var r = publishValueRegex.exec(topic);
  if(r == null || r == undefined){
    return false;
  }
  return r[0] == r['input'];
}
function sendDataToTranslate(data){
  var value = JSON.stringify({
    'value': parseFloat(data.value),
  });
  var options ={
    method: 'POST',
    uri: 'http://translate.ubidots.com:9080/things/'+data.dataSource+'/'+data.variable+'/values?token='+data.token,
    body: value,
    headers: {
      'content-type': 'application/json',
    }
  };
  request(options, function(error, response, body){
    if(error) {
        console.log(error);
    } else {
        console.log(response.statusCode, body);
    }
});
}

function publishValue(packet, token){
    var x = packet.topic.toString().split("/");
    var labelDataSource = x[3];
    var labelVariable = x[4];
    var value = packet.payload.toString();
    var data = {dataSource: labelDataSource, variable: labelVariable, value: value, token: token};
    sendDataToTranslate(data);
}
