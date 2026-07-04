const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'data', 'manajemen_kendaraan.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT * FROM Vehicle_Locations ORDER BY recorded_at DESC LIMIT 10', [], (err, rows) => {
  if (err) return console.error(err);
  console.log('Recent Vehicle_Locations:');
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
