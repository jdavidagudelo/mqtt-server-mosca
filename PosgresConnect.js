var pg = require('pg');
var conString = "postgres://ubidots:ubidotsDevel@localhost/ubidots_devel1";
var tokenSeconds = 21600; //Six hours
//uvGTOVmD1GNnJNgWWQggSusDKtunSb


//this initializes a connection pool
//it will keep idle connections open for a (configurable) 30 seconds
//and set a limit of 10 (also configurable)
pg.connect(conString, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  var now = new Date();
  var limit = new Date((now.getTime() - tokenSeconds*1000));
  console.log(limit);
  client.query("SELECT * from apikey_token where token = $1 and (expires = $2 or last_used >= $3);",
  ['uvGTOVmD1GNnJNgWWQggSusDKtunSb', false, limit], function(err, result) {
    //call `done()` to release the client back to the pool
    done();
    if(err) {
      return console.error('error running query', err);
    }
    console.log(result.rows.length);
    for(var i = 0; i < result.rows.length; i++){
      console.log(result.rows[i]);
    }
  });
});
/*var client = new pg.Client(conString);
client.connect(function(err) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
});
client.*/
