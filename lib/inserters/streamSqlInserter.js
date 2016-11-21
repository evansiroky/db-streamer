var async = require('async'),
  streamsql = require('streamsql');

var RowInserter = require('./rowInserter.js'),
  util = require('../util.js');

var StreamSqlInserter = function() {
  this.delimiter = '\t';
};

StreamSqlInserter.prototype = new RowInserter();

StreamSqlInserter.prototype._connect = function(callback) {
  var connectCfg = this.createConnectConfig();
  connectCfg.driver = this.driver;
  this.db = streamsql.connect(connectCfg, callback);
};

StreamSqlInserter.prototype.createConnectConfig = function() {
  throw new Error('must be implemented by inheriting class')
};

StreamSqlInserter.prototype.connect = function(callback) {

  if(!this.defer) {
    var self = this;
    this._connect(function(err) {
      if(!err) {
        self.setModel();
      }
      callback(err);
    });
  } else {
    callback();
  }
};

StreamSqlInserter.prototype.getStreamSqlTableWriteStream = function() {
  var fieldsCopy = []
  for (var i = 0; i < this.columns.length; i++) {
    fieldsCopy.push(this.columns[i])
  }
  var table = this.db.table(this.tableName, {
    fields: fieldsCopy,
    primaryKey: this.primaryKey
  });
  var ws = table.createWriteStream();
  return table.createWriteStream();
};

StreamSqlInserter.prototype.setModel = function(newTable, newColumns) {

  this.tableName = newTable ? newTable : this.tableName;
  this.columns = newColumns ? newColumns : this.columns;

  if(this.defer) {
    // write to file instead
    this.deferred = util.createDefered();
    this.dataStream = this.deferred.dataStream;
  } else {
    this.dataStream = this.getStreamSqlTableWriteStream();
  }

};

StreamSqlInserter.prototype.push = function(row) {
  // console.log('push', row)
  if(this.defer) {
    this.dataStream.write(util.makeBufferText(row, this.columns, this.delimiter, this.driver));
  } else {
    var filteredRow = {};
    for (var i = 0; i < this.columns.length; i++) {
      var k = this.columns[i];

      switch(k) {
        case 'createdAt':
        case 'updatedAt':
          filteredRow[k] = row[k] ? row[k] : new Date();
          break;
        default:
          filteredRow[k] = row[k];
          break;
      }
    }
    this.dataStream.write(filteredRow);
  }

};

StreamSqlInserter.prototype.setEndHandler = function(fn) {
  if(this.defer) {
    this.endHandler = fn;
  } else {
    var self = this,
      errors = [];

    this.dataStream.on('error', function(err) {
      console.error(err);
      errors.push(err);
    });

    this.dataStream.on('close', function() {
      self.db.close(function(closeErr) {
        fn(errors.length > 0 ? errors : closeErr);
      });
    });
  }
};

module.exports = StreamSqlInserter
