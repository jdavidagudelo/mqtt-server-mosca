var redis = require("redis");
var redisDatabase = 0;
var client = redis.createClient();
client.select(redisDatabase);
// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

client.on("Error", function (err) {
    console.log("Error " + err);
});
client.set("key", "value", redis.print);
client.get("key", function(err, reply) {
    // reply is null when the key is missing
    console.log(reply);
});
