# db-streamer

[![npm version](https://badge.fury.io/js/db-streamer.svg)](http://badge.fury.io/js/db-streamer) [![Build Status](https://travis-ci.org/evansiroky/db-streamer.svg?branch=master)](https://travis-ci.org/evansiroky/db-streamer) [![Dependency Status](https://david-dm.org/evansiroky/db-streamer.svg)](https://david-dm.org/evansiroky/db-streamer) [![Test Coverage](https://codeclimate.com/github/evansiroky/db-streamer/badges/coverage.svg)](https://codeclimate.com/github/evansiroky/db-streamer/coverage)

A cross-db library to stream data into and out of a SQL database.  Currently supports streaming data into or out of PostgreSQL, MySQL or SQLite.

## Table of Contents

* [Installation](#installation)
* [Inserting](#inserting)
* [Querying](#querying)

## Installation

In order to use this library, you must also install the additional libraries in your project depending on the database that you use.

### PostgreSQL

    npm install pg --save
    npm install pg-copy-streams --save
    npm install pg-hstore --save

#### With pg and node v0.10.x

You must also install the package `promise-polyfill` and write additional code.  See [here](https://github.com/brianc/node-postgres/issues/1057) for more details.

### MySQL

    npm install mysql --save
    npm install streamsql --save

### SQLite

    npm install sqlite3 --save
    npm install streamsql --save

#### Deferred inserting w/ SQLite

For now, deferred inserting with SQLite assumes that a unix shell is available to pipe commands to the sqlite3 binary tool.

## Inserting

```js
var dbStreamer = require('db-streamer'),
  connString = 'postgres://streamer:streamer@localhost:5432/streamer-test';

// create inserter
var inserter = dbStreamer.getInserter({
  dbConnString: connString,
  tableName: 'test_table',
  columns: ['a', 'b', 'c']
});

// establish connection
inserter.connect(function(err, client) {

  // push some rows
  inserter.push({a: 1, b: 'one', c: new Date() });
  inserter.push({a: 2, b: 'two', c: new Date() });
  inserter.push({a: 3, b: 'three', c: new Date() });

  // create child table inserter using deferring strategy
  // this is useful to avoid missing foreign key conflicts as a result of race conditions
  var childInserter = dbStreamer.getInserter({
    dbConnString: connString,
    tableName: 'child_table',
    columns: ['a', 'd', 'e'],
    deferUntilEnd: true
  });

  childInserter.push({a: 2, d: 'asdf', e: new Date() });
  childInserter.push({a: 3, d: 'ghjk', e: new Date() });

  childInserter.setEndHandler(callback);

  // set end callback
  inserter.setEndHandler(function() {
    childInserter.end();
  });

  // announce end
  inserter.end();

});
```

### Inserter Config

| Key | Description |
| --- | --- |
| dbConnString | A database connection string. |
| tableName | The tablename to insert into. |
| columns | Array of column names. |
| primaryKey | Required if using MySQL or SQLite.  String of the primary key (defaults to `id` if omitted). |
| deferUntilEnd | Boolean (default=false).  Stream output to temporary file which is then streamed in all at once into table upon calling `end`. |
| sqliteStorage | Required if using SQLite.  String of the filename to load data to.  Unfortunately, will not work with `:memory:` (well it will, but all data will be lost after disconnecting, so it's kind of pointless). |

### Inserter Config (Sequelize Bulk Insert alternative)

| Key | Description |
| --- | --- |
| useSequelizeBulkInsert | Boolean.  Perform the insert using a combination of [async.cargo](https://github.com/caolan/async#cargo) and [sequelize bulkInsert](http://docs.sequelizejs.com/en/latest/api/model/#bulkcreaterecords-options-promisearrayinstance).  Must provide `sequelizeModel` parameter too. |
| sequelizeModel | The sequelize model to perform a bulk insert with. |
| deferUntilEnd | Boolean (default=false).  Pause all cargo iterations until calling `end`. |

## Querying

```js
const querier = dbStreamer.getQuerier({
  dbConnString: 'postgres://streamer:streamer@localhost:5432/streamer-test'
})

querier.execute(
  'SELECT * FROM test_table',
  row => console.log,
  err => {
    console.log('done')
  }
)
```

### Inserter Config

| Key | Description |
| --- | --- |
| dbConnString | A database connection string. |
| sqliteStorage | Required if using SQLite.  String of the filename to load data from.  Unfortunately, will not work with `:memory:` (well it will, but a new connection is opened, so there won't be any data to query, so it's kind of pointless). |
