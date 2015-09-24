var fs = require('fs');

var copyFrom = require('pg-copy-streams').from,
  moment = require('moment'),
  pg = require('pg');

var RowInserter = require('./rowInserter.js');

var parseValue = function(column, v) {
  switch(column) {
    case 'createdAt':
    case 'updatedAt':
      return moment().toISOString();
      break;
    default:
      if(v === undefined || v === null) {
        return 'NULL';
      } else if(v instanceof Date) {
        return moment(v).toISOString();
      } else {
        return v;
      }
      break;
  }
}

var parseColumn = function(c) {
  switch(c) {
    case 'createdAt':
    case 'updatedAt':
      return '"' + c + '"';
      break;
    default:
      return c;
      break;
  }
}

var PgInserter = function(config) {
  
  this.dbConnString = config.dbConnString;
  this.tableName = config.tableName;
  this.columns = config.columns;
  this.defer = config.deferUntilEnd;

};

PgInserter.prototype = new RowInserter();

PgInserter.prototype.connect = function(callback) {
  
  this.client = new pg.Client(this.dbConnString);
  var self = this;
  this.client.connect(function(err) {
    if(!err) {
      self.setModel();
    }
    if(callback) {
      callback(err);
    }
  });

};

PgInserter.prototype.getCopyQueryText = function() {
  
  var queryTxt = 'COPY ' + this.tableName + '(',
    init = false;
  
  for (var i = 0; i < this.columns.length; i++) {
    if(!init) {
      init = true;
    } else {
      queryTxt += ', ';
    }
    queryTxt += parseColumn(this.columns[i]);
  }
  queryTxt += ') FROM STDIN NULL AS \'NULL\'';

  //console.log(queryTxt);

  return queryTxt;

};

PgInserter.prototype.setModel = function(newTable, newColumns) {
  
  this.tableName = newTable ? newTable : this.tableName;
  this.columns = newColumns ? newColumns : this.columns;

  if(this.defer) {
    // write to file instead
    this.tempDeferredFilename = 'temp_deferred_' + new Date().getTime() + '.tsv';
    this.dataStream = fs.createWriteStream(this.tempDeferredFilename);
  } else {
    this.dataStream = this.client.query(copyFrom(this.getCopyQueryText()));
  }

};

PgInserter.prototype.push = function(row) {

  var bufferTxt = '',
    init = false;
  
  for (var i = 0; i < this.columns.length; i++) {
    var k = this.columns[i];
    if(!init) {
      init = true;
    } else {
      bufferTxt += '\t';
    }
    bufferTxt += parseValue(k, row[k]);
  }

  bufferTxt += '\n';

  //console.log(bufferTxt);

  this.dataStream.write(Buffer(bufferTxt));

};

PgInserter.prototype.end = function() {

  this.dataStream.end();
  
  if(this.defer) {
    // load in data from file
    if(!this.endHandler) {
      var error = new Error('No end handler set.  Please call `setEndHandler` before calling `end`.');
      throw error;
      return;
    }

    var stream = this.client.query(copyFrom(this.getCopyQueryText())),
      fileStream = fs.createReadStream(this.tempDeferredFilename)
      self = this;

    fileStream.on('error', this.endHandler);
    fileStream.pipe(stream).on('finish', function() {
      // delete temp file
      fs.unlink(self.tempDeferredFilename, function() {
        // call callback
        self.endHandler();
      });
    }).on('error', this.endHandler);
  }

};

PgInserter.prototype.setEndHandler = function(fn) {
  if(this.defer) {
    // set end handler function
    this.endHandler = fn;
  } else {
    this.dataStream.on('end', fn);
  }
};

module.exports = function(config) {
  return new PgInserter(config);
}