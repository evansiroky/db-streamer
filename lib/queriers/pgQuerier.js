const pg = require('pg')
const QueryStream = require('pg-query-stream')

const PgQuerier = function (config) {
  this.dbConnString = config.dbConnString
}

PgQuerier.prototype.execute = function (
  query,
  rowCallback,
  completeCallback
) {
  pg.connect(this.dbConnString, function (err, client, done) {
    if (err) return completeCallback(err)
    const queryStream = new QueryStream(query)
    const stream = client.query(queryStream)
    let streamErr
    stream.on('error', error => { streamErr = error })
    stream.on('data', rowCallback)
    // release the client when the stream is finished
    stream.on('end', closeErr => {
      done()
      completeCallback(streamErr || closeErr)
    })
  })
}

module.exports = function (config) {
  return new PgQuerier(config)
}
