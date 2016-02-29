var exec = require('child_process').exec

if(process.env.DIALECT) {
  exec('npm run test-code', { env: process.env }, function() {});
} else if(process.env.COVERAGE) {
  exec('npm run codeclimate', function() {});
}