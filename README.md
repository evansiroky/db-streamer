# db-streamer

[![npm version](https://badge.fury.io/js/db-streamer.svg)](http://badge.fury.io/js/db-streamer)

A library to stream data into a SQL database.

## Current Status

Project is in alpha version.  Currently supports streaming data into PostgreSQL table.

## Example Usage

    var dbStreamer = require('db-streamer');
    
    // create inserter
    var inserter = dbStreamer.getInserter({
      dbConnString: 'postgres://streamer:streamer@localhost:5432/streamer-test',
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
        tableName: 'child_table',
        columns: ['a', 'd', 'e'],
        client: client,
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

## PostgreSQL

### Additional Dependencies

In order to use this library, you must also install the following libraries:

    npm install pg --save
    npm install pg-copy-streams --save
    npm install pg-hstore --save
