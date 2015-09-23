var parse = require('url-parse');

var streamer = {};

streamer.getInserter = function(config) {
  // return a new inserter class
  if(config.useSequelizeBulkInsert) {
    return require('./lib/inserters/sequelizeBulkInserter.js')(config);
  } else if(config.dbConnString) {
    var parsed = parse(config.dbConnString);
  }
  switch(parsed.protocol) {
    case 'postgres:':
      return require('./lib/inserters/pgInserter.js')(config);
      break;
    default:
      return require('./lib/inserters/sequelizeBulkInserter.js')(config);
      break;
  }
};

module.exports = streamer;