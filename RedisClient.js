var redis = require("redis");
var redisClient = redis.createClient();
var variableId = "xxx";
var topic = 'rt/variables/'+variableId+'/last_value';
redisClient.publish(topic, '{"value": 20,"timestamp": 1000, "context": {"lat":1.1, "lng":10.01}, "id": "77736663dhhhdh"}');
