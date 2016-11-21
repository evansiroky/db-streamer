var exec = require('child_process').exec,
  fs = require('fs'),
  path = require('path');

var async = require('async'),
  sqlite3 = require('sqlite3');

var StreamSqlInserter = require('./streamSqlInserter.js'),
  util = require('../util.js');

var SqliteInserter = function(config) {
  this.delimiter = '|';
  this.driver = 'sqlite3';
  this.tableName = config.tableName;
  this.columns = config.columns;
  this.defer = config.deferUntilEnd;
  this.storage = config.sqliteStorage;

  if(this.defer) {
    this.setModel();
  }

};

SqliteInserter.prototype = new StreamSqlInserter();

SqliteInserter.prototype.createConnectConfig = function() {
  return {
    filename: this.storage
  };
};

SqliteInserter.prototype.end = function() {

  this.dataStream.end();

  if(this.defer) {
    var self = this;

    var runCommandInBinaryTool = function(cmd, cb) {
      exec('echo "' + cmd + '" | sqlite3 ' + self.storage, cb)
    }

    async.auto({
      setDelimiter: function(cb) {
        runCommandInBinaryTool('.separator |', cb)
      },
      load: ['setDelimiter', function(results, cb) {
        var cmd = '.import ' +
          self.deferred.tempDeferredFilename +
          ' ' + self.tableName;
        runCommandInBinaryTool(cmd, cb);
      }],
      deleteTempFile: ['load', function(results, cb) {
        fs.unlink(self.deferred.tempDeferredFilename, cb);
      }]
    }, self.endHandler);
  }

}

module.exports = function(config) {
  return new SqliteInserter(config);
}
