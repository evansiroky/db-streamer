var Sequelize = require('sequelize');

module.exports = function(sequelizeConfig) {
  
  // establish sequelize connection
  var sequelize = new Sequelize(sequelizeConfig, { logging: false });

  var testModel = sequelize.define('test_table', {
    a: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    b: Sequelize.STRING,
    c: Sequelize.DATE
  }, {
    freezeTableName: true
  });

  return testModel;

}