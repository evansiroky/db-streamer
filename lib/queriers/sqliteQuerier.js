const sqlite3 = require('sqlite3').verbose()

const SqliteQuerier = function (config) {
  this.sqliteStorage = config.sqliteStorage
}

SqliteQuerier.prototype.execute = function (
  query,
  rowCallback,
  completeCallback
) {
  const db = new sqlite3.Database(this.sqliteStorage, openErr => {
    if (openErr) return completeCallback(openErr)
    let rowErrOccurred
    db.each(
      query,
      (rowErr, row) => {
        if (rowErrOccurred) return
        if (rowErr) {
          rowErrOccurred = rowErr
          return
        }
        rowCallback(row)
      },
      err => {
        db.close(closeErr => {
          completeCallback(err || closeErr)
        })
      }
    )
  })
}

module.exports = function (config) {
  return new SqliteQuerier(config)
}
