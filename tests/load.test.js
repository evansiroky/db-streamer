const assert = require('chai').assert
const moment = require('moment')
const rimraf = require('rimraf')

const dbStreamer = require('../index.js')

const config = require('./util').getConfig()

const assertDataExists = function (expectedObj, usedSequelizeInserter, callback) {
  setTimeout(function () {
    config.testModel
      .findOne({ where: { a: expectedObj.a } })
      .then(function (result) {
        assert.isNotNull(result)
        for (const k in expectedObj) {
          if (k === 'c') {
            let expectedUnix = Math.floor((new Date(expectedObj.c)).getTime() / 1000)
            if (!usedSequelizeInserter && ['mysql', 'sqlite'].indexOf(process.env.DIALECT) !== -1) {
              expectedUnix -= (new Date(expectedObj.c)).getTimezoneOffset() * 60
            }
            assert.equal(moment(result[k]).unix(), expectedUnix)
          } else {
            assert.equal(result[k], expectedObj[k])
          }
        }
      })
      .then(callback)
      .catch(callback)
  }, 500)
}

describe('data loading', function () {
  after(function () {
    rimraf.sync(config.sqliteStorage)
  })

  beforeEach(function () {
    // (re)create table
    this.timeout(15000)

    return config.testModel.sync({force: true})
  })

  const tests = [
    {
      config: config.streamerConfig,
      method: 'dialect'
    },
    {
      config: {
        sequelizeModel: config.testModel,
        useSequelizeBulkInsert: true
      },
      method: 'sequelize bulk'
    }
  ]

  tests.forEach(function (test) {
    it('data should load using ' + test.method + ' inserter', function (done) {
      this.timeout(15000)

      // create inserter
      const inserter = dbStreamer.getInserter(test.config)

      // establish connection
      inserter.connect(function (err) {
        if (err) return done(err)
        // push some rows
        const firstRow = { a: 1, b: 'one', c: new Date(12345) }
        inserter.push(firstRow)
        inserter.push({ a: 2, b: 'two', c: new Date() })
        inserter.push({ a: 3, b: 'three', c: new Date() })

        // create defered inserter
        test.config.deferUntilEnd = true
        const deferedInserter = dbStreamer.getInserter(test.config)
        const deferedRow = { a: 4, b: 'four', c: new Date(45678) }

        deferedInserter.push(deferedRow)
        deferedInserter.setEndHandler(function (err) {
          if (err) {
            done(err)
          } else {
            assertDataExists(deferedRow, test.config.useSequelizeBulkInsert, done)
          }
        })

        // set end callback
        inserter.setEndHandler(function (err) {
          if (err) {
            done(err)
          } else {
            assertDataExists(firstRow, test.config.useSequelizeBulkInsert, function (err) {
              if (err) {
                done(err)
              } else {
                deferedInserter.end()
              }
            })
          }
        })

        // announce end
        inserter.end()
      })
    })
  })
})
