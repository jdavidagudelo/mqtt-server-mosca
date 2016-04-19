var mosca = require('mosca')

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
  var authorized = (username === 'jdavid' && password.toString() === 'abc123');
  if (authorized) client.user = username;
  callback(null, authorized);
}

var server = new mosca.Server(moscaSettings);
server.on('ready', setup);

server.on('clientConnected', function(client) {

});

// fired when a message is received
server.on('published', function(packet, client) {
  var x = packet.topic.toString().split("/");
  var idAccount = x[3];
  var labelDataSource = x[4];
  var labelVariable = x[5];
  var value = packet.payload.toString();
  console.log(packet.topic);
  
});
server.authenticate = authenticate
// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running')
}
