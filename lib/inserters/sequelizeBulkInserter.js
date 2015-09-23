var async = require('async'),
  RowInserter = require('./rowInserter.js');

var SequelizeBulkInserter = function(config) {
  this.model = config.sequelizeModel;
  this.setModel();
};

SequelizeBulkInserter.prototype = new RowInserter();

SequelizeBulkInserter.prototype.setModel = function(newSequelizeModel) {
  this.model = newSequelizeModel ? newSequelizeModel : this.model;
  var model = this.model;
  this.bulkInserter = async.cargo(function(data, inserterCallback) {
      model.bulkCreate(data).then(function() {
          inserterCallback(); 
        }
      );
    },
    1000
  );
};

SequelizeBulkInserter.prototype.push = function(row) {
  this.bulkInserter.push(row);
};

SequelizeBulkInserter.prototype.setEndHandler = function(fn) {
  this.bulkInserter.drain = fn;
}

module.exports = function(config) {
  return new SequelizeBulkInserter(config);
}