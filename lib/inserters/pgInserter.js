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

  if(this.defer) {
    this.setModel();
  }

};

PgInserter.prototype = new RowInserter();

PgInserter.prototype.connect = function(callback) {
  
  var self = this;
  
  if(!this.defer) {
    pg.connect(this.dbConnString, function(err, client, done) {
      self.client = client;
      self.pgDone = done;
      if(!err) {
        self.setModel();
      }
      callback(err);
    });
  } else {
    callback();
  }
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

    var self = this;

    pg.connect(this.dbConnString, function(err, client, done) {
      var stream = client.query(copyFrom(self.getCopyQueryText())),
        fileStream = fs.createReadStream(self.tempDeferredFilename)
        doneFn = function(err) {
          done();
          self.endHandler(err);
        }

      fileStream.on('error', doneFn);
      fileStream.pipe(stream).on('finish', function() {
        // delete temp file
        fs.unlink(self.tempDeferredFilename, doneFn);
      }).on('error', doneFn);
    });
  } else {
    this.pgDone();
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