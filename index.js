var parse = require('url-parse');

var streamer = {};

streamer.getInserter = function(config) {
  // return a new inserter class
  var parsed;
  if(config.useSequelizeBulkInsert) {
    return require('./lib/inserters/sequelizeBulkInserter.js')(config);
  } else if(config.dbConnString) {
    parsed = parse(config.dbConnString);
  }
  switch(parsed.protocol) {
    case 'postgres:':
      return require('./lib/inserters/pgInserter.js')(config);
      break;
    case 'mysql:':
      if(parsed) {
        config.dbname = parsed.pathname.substr(1);
        config.username = parsed.username;
        config.password = parsed.password;
        config.hostname = parsed.hostname;
        config.port = parseInt(parsed.port, 10);
      }
      return require('./lib/inserters/mySqlInserter.js')(config);
    default:
      return require('./lib/inserters/sequelizeBulkInserter.js')(config);
      break;
  }
};

module.exports = streamer;