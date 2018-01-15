const fs = require('fs')
const path = require('path')

const async = require('async')
const mysql = require('mysql')

const StreamSqlInserter = require('./streamSqlInserter.js')

var MySqlInserter = function (config) {
  this.dbname = config.dbname
  this.driver = 'mysql'
  this.username = config.username
  this.password = config.password
  this.tableName = config.tableName
  this.columns = config.columns
  this.hostname = config.hostname
  this.port = config.port
  this.defer = config.deferUntilEnd
  this.primaryKey = config.primaryKey

  if (this.defer) {
    this.setModel()
  }
}

MySqlInserter.prototype = new StreamSqlInserter()

MySqlInserter.prototype.createConnectConfig = function () {
  return {
    database: this.dbname,
    host: this.hostname,
    password: this.password,
    port: this.port,
    user: this.username
  }
}

MySqlInserter.prototype.end = function () {
  this.dataStream.end()

  if (this.defer) {
    const self = this
    const conn = mysql.createConnection(this.createConnectConfig())
    let loadText = 'LOAD DATA LOCAL INFILE ? INTO TABLE ' + this.tableName + ' ('

    for (var i = 0; i < self.columns.length; i++) {
      if (i > 0) {
        loadText += ','
      }
      loadText += self.columns[i]
    };
    loadText += ')'

    async.auto({
      connect: function (cb) {
        conn.connect(cb)
      },
      load: ['connect', function (results, cb) {
        conn.query(loadText,
          [path.join(process.cwd(), self.deferred.tempDeferredFilename)],
          cb)
      }],
      deleteTempFile: ['load', function (results, cb) {
        fs.unlink(self.deferred.tempDeferredFilename, cb)
      }],
      closeConnection: ['load', function (results, cb) {
        conn.end(cb)
      }]
    }, self.endHandler)
  }
}

module.exports = function (config) {
  return new MySqlInserter(config)
}
