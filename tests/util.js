const path = require('path')

const Sequelize = require('sequelize')

if (typeof Promise === 'undefined') {
  global.Promise = require('promise-polyfill')
}

/**
 * Get some common config for running tests
 */
function getConfig () {
  let sequelizeConfig = {
    database: 'streamer_test',
    logging: false,
    username: 'streamer'
  }
  const streamerConfig = {
    columns: ['a', 'b', 'c', 'createdAt', 'updatedAt'],
    primaryKey: 'a',
    tableName: 'test_table'
  }
  const sqliteStorage = path.resolve(__dirname) + '/temp.sqlite'

  switch (process.env.DIALECT) {
    case 'mysql':
      sequelizeConfig.dialect = 'mysql'
      sequelizeConfig.password = 'streamer1234'
      streamerConfig.dbConnString = 'mysql://streamer:streamer1234@localhost:3306/streamer_test'
      break
    case 'postgres':
      sequelizeConfig.dialect = 'postgresql'
      sequelizeConfig.password = 'streamer'
      streamerConfig.dbConnString = 'postgres://streamer:streamer@localhost:5432/streamer_test'
      break
    case 'sqlite':
      sequelizeConfig = {
        dialect: 'sqlite',
        logging: false,
        storage: sqliteStorage
      }
      streamerConfig.sqliteStorage = sqliteStorage
      break
    default:
      throw new Error('Invalid DIALECT')
  }

  const sequelize = new Sequelize(
    sequelizeConfig.database,
    sequelizeConfig.username,
    sequelizeConfig.password,
    sequelizeConfig
  )
  const testModel = sequelize.define(
    'test_table',
    {
      a: {
        type: Sequelize.INTEGER,
        primaryKey: true
      },
      b: Sequelize.STRING,
      c: Sequelize.DATE
    }, {
      freezeTableName: true
    }
  )

  return {
    sequelize: sequelize,
    sqliteStorage: sqliteStorage,
    streamerConfig: streamerConfig,
    testModel: testModel
  }
}

module.exports = {
  getConfig: getConfig
}
