const config = require('config');

const dbConnection = config.get('DBConnection');

const dbConn = {
    iHost: '',
    iUser: '',
    iPort: '',
}

let host = '';

if (config.has('DBConnection.host')) {
   dbConn.iHost = config.get('DBConnection.host');
} else {
   throw new Error('error in config DBConnection.host');
}

console.log(dbConn.iHost);

// run something