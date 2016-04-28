var mqtt = require("mqtt");
var client  = mqtt.connect('mqtt://localhost', {username:'c74qFmzI7ikTmZ3dFvF3e2hPEmCfu5', password:""});
client.subscribe({"/v1.6/thg/c74qFmzI7ikTmZ3dFvF3e2hPEmCfu5/label_ds/label_var/value": 1}, function(err, granted) {
  console.log(err);
  console.log(granted);
});
client.on('message', function(topic, message, packet) {
  console.log(topic);
  console.log(message);
  console.log(packet);
});
