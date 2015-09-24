var dbStreamer = require('../index.js');

module.exports = function(testModel, streamerConfig, callback) {

  // create table
  testModel.sync({force: true}).then(function() {

    // create inserter
    var inserter = dbStreamer.getInserter(streamerConfig);

    // establish connection
    inserter.connect(function() {

      // push some rows
      inserter.push({a: 1, b: 'one', c: new Date() });
      inserter.push({a: 2, b: 'two', c: new Date() });
      inserter.push({a: 3, b: 'three', c: new Date() });

      // set end callback
      inserter.setEndHandler(callback);

      // announce end
      inserter.end();

    });

  });
}