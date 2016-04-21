mqtt = require("mqtt");
var mosca = require('mosca')
fs = require("fs");
var SECURE_KEY = 'cert/ryans-key.pem';
var SECURE_CERT =  'cert/ryans-cert.pem';
var SECURE_CSR = 'cert/ryans-csr.pem';

const options = {
  // These are necessary only if using the client certificate authentication
  key: fs.readFileSync(SECURE_KEY),
  cert: fs.readFileSync(SECURE_CERT),
  rejectUnauthorized: false,
  // This is necessary only if the server uses the self-signed certificate
  ca: fs.readFileSync(SECURE_CSR),
  username:'jdavid',
  password:"abc123"
};
