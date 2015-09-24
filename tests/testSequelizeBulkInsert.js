var Promise = require('bluebird');

var testMain = require('./testMain'),
  getTestModel = require('./testModel.js');

var sequelizeConfig = 'postgres://streamer:streamer@localhost:5432/streamer-test',
  testModel = getTestModel(sequelizeConfig),
  streamerConfig = {
    useSequelizeBulkInsert: true,
    sequelizeModel: testModel
  };

describe('sequelize-bulk-insert-load', function() {
  it('bulkInsert should load', function() {
    var testMainPromise = Promise.promisify(testMain);
    return testMainPromise(testModel, streamerConfig);
  });
});