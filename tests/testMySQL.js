var Promise = require('bluebird');

var testMain = require('./testMain.js'),
  testModel = require('./testModel.js');

var sequelizeConfig = 'mysql://streamer:streamer1234@localhost:3306/streamer-test',
  streamerConfig = {
    dbConnString: sequelizeConfig,
    tableName: 'test_table',
    columns: ['a', 'b', 'c', 'createdAt', 'updatedAt'],
    primaryKey: 'a'
  };

describe('mysql', function() {
  it('data should load', function() {
    var testMainPromise = Promise.promisify(testMain);
    return testMainPromise(testModel(sequelizeConfig), streamerConfig);
  });
});