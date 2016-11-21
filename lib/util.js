var fs = require('fs');

var moment = require('moment');

var util = {};

util.createDefered = function() {
  var tempDeferredFilename = 'temp_deferred_' + Math.random() + '.tsv';
  var dataStream = fs.createWriteStream(tempDeferredFilename);

  return {
    tempDeferredFilename: tempDeferredFilename,
    dataStream: dataStream
  }
};

util.makeDateTime = function(d, driver) {
  d = d ? moment(d) : moment();
  if(driver=='mysql') {
    return d.format('YYYY-MM-DDTHH:mm:ss');
  } else if(driver === 'sqlite3') {
    return d.format('YYYY-MM-DD HH:mm:ss');
  } else {
    return d.toISOString();
  }
}

util.makeBufferText = function(row, columns, delimiter, driver) {

  var bufferTxt = '',
    delimiter = delimiter || '\t'
    init = false;

  for (var i = 0; i < columns.length; i++) {
    var k = columns[i];
    if(!init) {
      init = true;
    } else {
      bufferTxt += delimiter;
    }
    bufferTxt += util.parseValue(k, row[k], driver);
  }

  bufferTxt += '\n';

  //console.log(bufferTxt);

  return Buffer(bufferTxt);
};

util.parseValue = function(column, v, driver) {
  switch(column) {
    case 'createdAt':
    case 'updatedAt':
      return util.makeDateTime(null, driver);
      break;
    default:
      if(v === undefined || v === null) {
        return 'NULL';
      } else if(v instanceof Date) {
        return util.makeDateTime(v, driver);
      } else {
        return v;
      }
      break;
  }
}

module.exports = util;
