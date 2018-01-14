const mysql = require('mysql')

const MysqlQuerier = function (config) {
  this.dbname = config.dbname
  this.username = config.username
  this.password = config.password
  this.hostname = config.hostname
  this.port = config.port
}

MysqlQuerier.prototype.execute = function (
  query,
  rowCallback,
  completeCallback
) {
  const connection = mysql.createConnection({
    database: this.dbname,
    host: this.hostname,
    password: this.password,
    port: this.port,
    user: this.username
  })

  connection.connect(err => {
    if (err) return completeCallback(err)
    connection.query(query)
      .on('error', error => { err = error })
      .on('result', rowCallback)
      .on('end', () => {
        connection.end(closeErr => {
          if (err) {
            completeCallback(err)
          } else if (closeErr) {
            completeCallback(closeErr)
          } else {
            completeCallback()
          }
        })
      })
  })
}

module.exports = function (config) {
  return new MysqlQuerier(config)
}
