var mosca = require('mosca')

var SECURE_KEY = __dirname + '/cert/ryans-key.pem';
var SECURE_CERT = __dirname + '/cert/ryans-cert.pem';

var settings = {
  port: 8443,
  logger: {
    name: "secureExample",
    level: 40,
  },
  secure : {
    keyPath: SECURE_KEY,
    certPath: SECURE_CERT,
  },
  type: 'redis',
  redis: require('redis'),
  db: 12,
  port: 6379,
  return_buffers: true,
  host: "localhost"
};
var authenticate = function(client, username, password, callback) {
  var authorized = (username === 'jdavid' && password.toString() === 'abc123');
  if (authorized) client.user = username;
  callback(null, authorized);
}

var server = new mosca.Server(settings);
server.authenticate = authenticate
server.on('clientConnected', function(client) {

    console.log('client connected', client.id);
});

// fired when a message is received
server.on('published', function(packet, client) {
  console.log('Published', packet.payload.toString(), "to", packet.topic);
});
server.on('ready', setup);

// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running')
}
