
//var client  = mqtt.connect('mqtt://localhost', options);
mqtt = require("mqtt");
var client  = mqtt.connect('mqtt://localhost', {username:'uvGTOVmD1GNnJNgWWQggSusDKtunSb', password:""});
client.publish("/v1.6/thg/label_ds/label_var/value/post", "10.3", {'qos':1, 'retain':false}, function(err, x){
  console.log(err);
  console.log(x);
});
//client.publish("/v1.6/thg/label_ds/label_var/value/lv", "10.3");
