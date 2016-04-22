var http = require('http'),
    url = require('url'),
    request = require('request'),
    util = require('util'),
    async = require('async');


var host = 'things.ubidots.com';
var port = process.env.PORT || 1338;


function _request(opts, cb){
  var url = util.format("http://%s/%s", host, opts.endpoint);
  var headers = opts.headers || {};
  
  headers['X-Auth-Token'] = opts.token;
  
  request({
    url: url,
    method: opts.method || 'GET',
    body: opts.body || {},
    headers: headers,
    json: true
  }, function (err, res, body) {
    cb(err, res, body);
  });
  
  
}


function postValue(options, callback){
  var opts = {
    endpoint: util.format('api/v1.6/variables/%s/values', options.variable),
    method: 'POST',
    token: options.token,
    body:{
      value: options.value
    }
  };
  if (options.timestamp){
    opts.body.timestamp = options.timestamp;
  }

  if (options.context){
    opts.body.context = {};
    options.context.split(",").forEach(function(data){
      try{
        var ctx = data.split("=");
        opts.body.context[ctx[0]] = ctx[1];
      }catch(err){}
    });
  }

  _request(opts, function(err, response, body){
    callback(err, response, body);
  });
};

function postCollection(options, callback){
  var data=[];
  for (var i=0; i<options.variable.length; i++){
    try{
      var vl = {variable: options.variable[i],
                value: options.value[i]};
      
      if (options.timestamp && options.timestamp[i]){
        vl['timestamp'] = options.timestamp[i];
      }

      if (options.context && options.context[i]){
        vl['context'] = {};
        options.context[i].split(",").forEach(function(data){
          try{
            var ctx = data.split("=");
            vl['context'][ctx[0]] = ctx[1];
          }catch(err){}
        });
      }
      data.push(vl);
    }catch(err){}
    
  }
  
  var opts = {
    endpoint: util.format('api/v1.6/collections/values/?force=true'),
    method: 'POST',
    token: options.token,
    body: data
  };
  _request(opts, function(err, response, body){
    callback(err, response, body);
  });
};


function postOneValue(params, res){
  if (params.token && params.variable && params.value){
    postValue(params, function(err, response, body){
      res.writeHead(response.statusCode, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(body));
    });
  }else{
    res.writeHead(400, {'Content-Type': 'application/json'});
    res.end('{"detail":"Missing parameters"}');
  }
}


function postMultipleValue(params, res){
  if (params.token && params.variable && params.value){
    postCollection(params, function(err, response, body){
      res.writeHead(response.statusCode, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(body));
    });
  }else{
    res.writeHead(400, {'Content-Type': 'application/json'});
    res.end('{"detail":"Missing parameters"}');
  }
}


var postData = {'string': postOneValue,
                'object': postMultipleValue};

http.createServer(function (req, res) {
  if(req.method=='GET') {
    var params = url.parse(req.url, true).query;
    console.log(params);

    if (params.token === undefined){
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end('{"detail":"Missing parameters"}');
    }
    try{
      postData[typeof(params.variable)](params, res);
    }catch(err){
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end('{"detail":"Missing parameters"}');
      return;
    }
  }else{
    res.writeHead(401, {'Content-Type': 'application/json'});
    res.end('{"detail":"Method not allowed."}');
  }
}).listen(port);

console.log('Server running at http://127.0.0.1:'+port+'/');
