var Promise = require('bluebird');

var testMain = require('./testMain.js'),
  testModel = require('./testModel.js');

var sequelizeConfig = 'postgres://streamer:streamer@localhost:5432/streamer-test',
  streamerConfig = {
    dbConnString: sequelizeConfig,
    tableName: 'test_table',
    columns: ['a', 'b', 'c', 'createdAt', 'updatedAt']
  };

describe('pg-load', function() {
  it('copy stream should load', function() {
    var testMainPromise = Promise.promisify(testMain);
    return testMainPromise(testModel(sequelizeConfig), streamerConfig);
  });

  it('deferred copy stream should load', function() {
    var testMainPromise = Promise.promisify(testMain);
    streamerConfig.deferUntilEnd = true;
    return testMainPromise(testModel(sequelizeConfig), streamerConfig);
  });
});