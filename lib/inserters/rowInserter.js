var RowInserter = module.exports = function() {};

RowInserter.prototype.end = function() {};

RowInserter.prototype.connect = function(callback) {
  if(callback) {
    callback();
  }
};

module.exports = RowInserter;