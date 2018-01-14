const fs = require('fs')

const copyFrom = require('pg-copy-streams').from
const pg = require('pg')

const RowInserter = require('./rowInserter.js')
const util = require('../util.js')

const parseColumn = function (c) {
  switch (c) {
    case 'createdAt':
    case 'updatedAt':
      return '"' + c + '"'
    default:
      return c
  }
}

const PgInserter = function (config) {
  this.dbConnString = config.dbConnString
  this.tableName = config.tableName
  this.columns = config.columns
  this.defer = config.deferUntilEnd

  if (this.defer) {
    this.setModel()
  }
}

PgInserter.prototype = new RowInserter()

PgInserter.prototype.connect = function (callback) {
  let self = this

  if (!this.defer) {
    pg.connect(this.dbConnString, function (err, client, done) {
      self.client = client
      self.pgDone = done
      if (!err) {
        self.setModel()
      }
      callback(err)
    })
  } else {
    callback()
  }
}

PgInserter.prototype.getCopyQueryText = function () {
  let queryTxt = 'COPY ' + this.tableName + '('
  let init = false

  for (let i = 0; i < this.columns.length; i++) {
    if (!init) {
      init = true
    } else {
      queryTxt += ', '
    }
    queryTxt += parseColumn(this.columns[i])
  }
  queryTxt += ') FROM STDIN NULL AS \'NULL\''

  // console.log(queryTxt);

  return queryTxt
}

PgInserter.prototype.setModel = function (newTable, newColumns) {
  this.tableName = newTable || this.tableName
  this.columns = newColumns || this.columns

  if (this.defer) {
    // write to file instead
    this.deferred = util.createDefered()
    this.dataStream = this.deferred.dataStream
  } else {
    this.dataStream = this.client.query(copyFrom(this.getCopyQueryText()))
  }
}

PgInserter.prototype.push = function (row) {
  this.dataStream.write(util.makeBufferText(row, this.columns))
}

PgInserter.prototype.end = function () {
  this.dataStream.end()

  if (this.defer) {
    // load in data from file
    if (!this.endHandler) {
      const error = new Error('No end handler set.  Please call `setEndHandler` before calling `end`.')
      throw error
    }

    const self = this

    pg.connect(this.dbConnString, function (err, client, done) {
      function doneFn (err) {
        done()
        self.endHandler(err)
      }

      if (err) {
        doneFn(err)
      }

      const stream = client.query(copyFrom(self.getCopyQueryText()))
      const fileStream = fs.createReadStream(self.deferred.tempDeferredFilename)

      fileStream.on('error', doneFn)
      fileStream.pipe(stream).on('finish', function () {
        // delete temp file
        fs.unlink(self.deferred.tempDeferredFilename, doneFn)
      })
    })
  } else {
    this.pgDone()
  }
}

PgInserter.prototype.setEndHandler = function (fn) {
  if (this.defer) {
    // set end handler function
    this.endHandler = fn
  } else {
    this.dataStream.on('end', fn)
  }
}

module.exports = function (config) {
  return new PgInserter(config)
}
