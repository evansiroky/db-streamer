var fs = require('fs'),
  path = require('path');

var streamsql = require('streamsql'),
  mysql = require('mysql');

var RowInserter = require('./rowInserter.js'),
  util = require('../util.js');

var MySqlInserter = function(config) {
  
  this.dbname = config.dbname;
  this.username = config.username;
  this.password = config.password;
  this.tableName = config.tableName;
  this.columns = config.columns;
  this.hostname = config.hostname;
  this.port = config.port;
  this.defer = config.deferUntilEnd;
  this.primaryKey = config.primaryKey;

  if(this.defer) {
    this.setModel();
  }

};

MySqlInserter.prototype = new RowInserter();

MySqlInserter.prototype._connect = function(callback) {
  
  var connectCfg = this.createConnectConfig();
  connectCfg.driver = 'mysql';
  this.db = streamsql.connect(connectCfg, callback);
};

MySqlInserter.prototype.createConnectConfig = function() {
  return {
    host: this.hostname,
    port: this.port,
    user: this.username,
    password: this.password,
    database: this.dbname
  };
};

MySqlInserter.prototype.connect = function(callback) {
  
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

MySqlInserter.prototype.getStreamSqlTableWriteStream = function() {
  var table = this.db.table(this.tableName, {
    fields: this.columns,
    primaryKey: this.primaryKey
  });
  var ws = table.createWriteStream();
  return table.createWriteStream();
};

MySqlInserter.prototype.setModel = function(newTable, newColumns) {
  
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

MySqlInserter.prototype.push = function(row) {

  if(this.defer) {
    this.dataStream.write(util.makeBufferText(row, this.columns, 'mysql'));
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

MySqlInserter.prototype.end = function() {

  this.dataStream.end();

  if(this.defer) {
    var self = this,
      conn = mysql.createConnection(this.createConnectConfig()),
      loadText = 'LOAD DATA LOCAL INFILE ? INTO TABLE ' + this.tableName + ' (';

    conn.connect(function(err) {
      if(err) {
        self.endHandler(err);
      }

      for (var i = 0; i < self.columns.length; i++) {
        if(i > 0) {
          loadText += ',';
        }
        loadText += self.columns[i];
      };
      loadText += ')';

      conn.query(loadText, 
        [path.join(process.cwd(), self.deferred.tempDeferredFilename)], 
        function(err) {
          fs.unlink(self.deferred.tempDeferredFilename, function(unlinkErr) {
            self.endHandler(err ? err : unlinkErr)
          });
        });
    });
  }

}

MySqlInserter.prototype.setEndHandler = function(fn) {
  if(this.defer) {
    this.endHandler = fn;
  } else {
    var self = this,
      errors = [];
      
    this.dataStream.on('error', function(err) {
      errors.push(err);
    });

    this.dataStream.on('close', function(err) {
      self.db.close(function(closeErr) {
        fn(errors.length > 0 ? errors : closeErr);
      });
    });
  }
};

module.exports = function(config) {
  return new MySqlInserter(config);
}