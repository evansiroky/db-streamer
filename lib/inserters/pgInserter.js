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

PgInserter.prototype.setModel = function(newTable, newColumns) {
  this.tableName = newTable ? newTable : this.tableName;
  this.columns = newColumns ? newColumns : this.columns;

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

  this.queryStream = this.client.query(copyFrom(queryTxt));
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

  this.queryStream.write(Buffer(bufferTxt));

};

PgInserter.prototype.end = function() {
  this.queryStream.end();
};

PgInserter.prototype.setEndHandler = function(fn) {
  this.queryStream.on('end', fn);
};

module.exports = function(config) {
  return new PgInserter(config);
}