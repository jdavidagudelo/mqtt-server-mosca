mqtt = require("mqtt");
var client  = mqtt.connect('mqtt://localhost', {username:'uvGTOVmD1GNnJNgWWQggSusDKtunSb', password:""});
client.on('message', function(topic, message, packet) {
  console.log(topic);
  console.log(message);
  console.log(packet);
});
client.subscribe({"/v1.6/thg/uvGTOVmD1GNnJNgWWQggSusDKtunSb/label_ds/label_var/valuei182": 1}, function(err, granted) {
  console.log(err);
  console.log(granted);
});
