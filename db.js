const sqlite3 = require('sqlite3').verbose();

function getDB(file = 'boards.db') {
  return new sqlite3.Database(file);
}

module.exports = { getDB };
