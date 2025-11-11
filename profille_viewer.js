const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./profile.db');

db.all('SELECT * FROM profiles', (err, rows) => {
  if (err) throw err;
  console.log(rows);
});
