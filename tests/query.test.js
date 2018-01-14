const assert = require('chai').assert

const rimraf = require('rimraf')

const dbStreamer = require('../index.js')

const config = require('./util').getConfig()

describe('querying', () => {
  after(function () {
    rimraf.sync(config.sqliteStorage)
  })

  beforeEach(function () {
    // (re)create table
    this.timeout(15000)

    // create table
    return config.testModel.sync({force: true})
      .then(() => {
        // load a bunch of rows
        return config.testModel
          .bulkCreate(
            [
              { a: 1, b: '1', c: new Date(2008, 1, 1) },
              { a: 2, b: '2', c: new Date(2008, 2, 2) },
              { a: 3, b: '3', c: new Date(2008, 3, 3) },
              { a: 4, b: '4', c: new Date(2008, 4, 4) },
              { a: 5, b: '5', c: new Date(2008, 5, 5) },
              { a: 6, b: '6', c: new Date(2008, 6, 6) },
              { a: 7, b: '7', c: new Date(2008, 7, 7) }
            ]
          )
      })
  })

  it('should stream a query', (done) => {
    const querier = dbStreamer.getQuerier(config.streamerConfig)

    let numRows = 0

    /**
     * Make sure each row returned has a certain type and tally number of rows
     */
    function rowCallback (row) {
      assert.typeOf(row, 'object')
      assert.typeOf(row.a, 'number')
      assert.typeOf(row.b, 'string')
      assert.typeOf(row.c, process.env.DIALECT === 'sqlite' ? 'string' : 'date')
      numRows++
    }

    /**
     * Make sure total number of rows found is 7
     */
    function completeCallback (err) {
      assert.equal(numRows, 7)
      done(err)
    }

    querier.execute(
      'SELECT * FROM test_table',
      rowCallback,
      completeCallback
    )
  })
})
