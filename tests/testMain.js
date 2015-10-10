var dbStreamer = require('../index.js');

module.exports = function(testModel, streamerConfig, callback) {

  // create table
  testModel.sync({force: true}).then(function() {

    // create inserter
    var inserter = dbStreamer.getInserter(streamerConfig);

    // establish connection
    inserter.connect(function(err) {

      // push some rows
      inserter.push({a: 1, b: 'one', c: new Date() });
      inserter.push({a: 2, b: 'two', c: new Date() });
      inserter.push({a: 3, b: 'three', c: new Date() });

      // create defered inserter
      streamerConfig.deferUntilEnd = true;
      var deferedInserter = dbStreamer.getInserter(streamerConfig);

      deferedInserter.push({a: 4, b: 'four', c: new Date() });
      deferedInserter.setEndHandler(callback);

      // set end callback
      inserter.setEndHandler(function(err) {
        if(err) {
          callback(err);
        } else {
          deferedInserter.end();
        }
      });

      // announce end
      inserter.end();

    });

  });
}