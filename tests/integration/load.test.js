var path = require('path')

var assert = require('chai').assert,
  moment = require('moment'),
  rimraf = require('rimraf'),
  Sequelize = require('sequelize');

var dbStreamer = require('../../index.js');

if (typeof Promise == 'undefined') {
  global.Promise = require('promise-polyfill')
}

var sequelizeConfig = {
    database: 'streamer_test',
    logging: false,
    username: 'streamer'
  },
  streamerConfig = {
    tableName: 'test_table',
    columns: ['a', 'b', 'c', 'createdAt', 'updatedAt'],
    primaryKey: 'a'
  },
  sqliteStorage = path.resolve(__dirname) + '/temp.sqlite'

switch(process.env.DIALECT) {
  case 'mysql':
    sequelizeConfig.dialect = 'mysql';
    sequelizeConfig.password = 'streamer1234';
    streamerConfig.dbConnString = 'mysql://streamer:streamer1234@localhost:3306/streamer_test';
    break;
  case 'postgres':
    sequelizeConfig.dialect = 'postgresql';
    sequelizeConfig.password = 'streamer';
    streamerConfig.dbConnString = 'postgres://streamer:streamer@localhost:5432/streamer_test';
    break;
  case 'sqlite':
    sequelizeConfig = {
      dialect: 'sqlite',
      logging: false,
      storage: sqliteStorage
    };
    streamerConfig.sqliteStorage = sqliteStorage
    break;
  default:
    throw new Error('Invalid DIALECT');
    break;
}

var sequelize = new Sequelize(
    sequelizeConfig.database,
    sequelizeConfig.username,
    sequelizeConfig.password,
    sequelizeConfig
  ),
  testModel = sequelize.define('test_table', {
    a: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    b: Sequelize.STRING,
    c: Sequelize.DATE
  }, {
    freezeTableName: true
  });

var assertDataExists = function(expectedObj, usedSequelizeInserter, callback) {
  setTimeout(function() {
    testModel
      .findOne({ where: { a: expectedObj.a } })
      .then(function(result) {
          assert.isNotNull(result);
          for(k in expectedObj) {
            if(k === 'c') {
              var expectedUnix = Math.floor((new Date(expectedObj.c)).getTime() / 1000);
              if(!usedSequelizeInserter && ['mysql', 'sqlite'].indexOf(process.env.DIALECT) !== -1) {
                expectedUnix -= (new Date(expectedObj.c)).getTimezoneOffset() * 60;
              }
              assert.equal(moment(result[k]).unix(), expectedUnix);
            } else {
              assert.equal(result[k], expectedObj[k]);
            }
          }
        })
      .then(callback)
      .catch(callback);
  }, 500);
}

describe('data loading', function() {

  after(function() {
    rimraf.sync(sqliteStorage)
  })

  beforeEach(function() {
    // (re)create table
    this.timeout(15000);

    return testModel.sync({force: true});
  });

  var tests = [
    { method: 'dialect', config: streamerConfig },
    { method: 'sequelize bulk', config: { useSequelizeBulkInsert: true, sequelizeModel: testModel} }
  ]

  tests.forEach(function(test) {
    it('data should load using ' + test.method + ' inserter', function(done) {
      this.timeout(15000);

      // create inserter
      var inserter = dbStreamer.getInserter(test.config);

      // establish connection
      inserter.connect(function(err) {

        // push some rows
        var firstRow = {a: 1, b: 'one', c: new Date(12345) };
        inserter.push(firstRow);
        inserter.push({a: 2, b: 'two', c: new Date() });
        inserter.push({a: 3, b: 'three', c: new Date() });

        // create defered inserter
        test.config.deferUntilEnd = true;
        var deferedInserter = dbStreamer.getInserter(test.config),
          deferedRow = {a: 4, b: 'four', c: new Date(45678) };

        deferedInserter.push(deferedRow);
        deferedInserter.setEndHandler(function(err) {
            if(err) {
              done(err);
            } else {
              assertDataExists(deferedRow, test.config.useSequelizeBulkInsert, done)
            }
          });

        // set end callback
        inserter.setEndHandler(function(err) {
          if(err) {
            done(err);
          } else {
            assertDataExists(firstRow, test.config.useSequelizeBulkInsert, function(err) {
                if(err) {
                  done(err);
                } else {
                  deferedInserter.end();
                }
              });
          }
        });

        // announce end
        inserter.end();

      });
    });
  });
});
