var parse = require('url-parse')

var streamer = {}

streamer.getInserter = function (config) {
  // return a new inserter class
  if (config.useSequelizeBulkInsert) {
    return require('./lib/inserters/sequelizeBulkInserter.js')(config)
  } else if (config.dbConnString) {
    const parsed = parse(config.dbConnString)
    switch (parsed.protocol) {
      case 'postgres:':
        return require('./lib/inserters/pgInserter.js')(config)
      case 'mysql:':
        if (parsed) {
          config.dbname = parsed.pathname.substr(1)
          config.username = parsed.username
          config.password = parsed.password
          config.hostname = parsed.hostname
          config.port = parseInt(parsed.port, 10)
        }
        return require('./lib/inserters/mySqlInserter.js')(config)
      default:
        return require('./lib/inserters/sequelizeBulkInserter.js')(config)
    }
  } else if (config.sqliteStorage) {
    return require('./lib/inserters/sqliteInserter.js')(config)
  }
}

streamer.getQuerier = function (config) {
  if (config.dbConnString) {
    const parsed = parse(config.dbConnString)
    switch (parsed.protocol) {
      case 'postgres:':
        return require('./lib/queriers/pgQuerier.js')(config)
      case 'mysql:':
        if (parsed) {
          config.dbname = parsed.pathname.substr(1)
          config.username = parsed.username
          config.password = parsed.password
          config.hostname = parsed.hostname
          config.port = parseInt(parsed.port, 10)
        }
        return require('./lib/queriers/mysqlQuerier.js')(config)
      default:
        throw new Error('Unsupported protocol: ' + parsed.protocol)
    }
  } else if (config.sqliteStorage) {
    return require('./lib/queriers/sqliteQuerier.js')(config)
  } else {
    throw new Error('Unrecognized config.  Could not find `dbConnString` or `sqliteStorage`')
  }
}

module.exports = streamer
