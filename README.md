Install node version 0.10.42:

    cd /usr/local
    tar --strip-components 1 -xzf path/to/node-v0.10.42-linux-x64.tar.gz

Install Mosca and required libraries with npm:

    npm install mosca bunyan -g
    npm install memdown
    npm install mqtt

install redis client:

    npm install redis

Install postgres client:

    npm install pg

Install request:

    npm install request
    
Install Mocha:

    npm install -g mocha
    
To run server:

    cd path/to/src
    node UbidotsMoscaServer.js
    
To run tests:

    cd path/to/tests/folder
    mocha Validator.js UbidotsMoscaServerAuthentication.js UbidotsMoscaServerAuthorization.js
    
    