const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const databasePath = path.resolve(__dirname, '..', '..', 'data', 'manajemen_kendaraan.db');

const db = new sqlite3.Database(databasePath, (err) => {
  if (err) {
    console.error('Gagal membuka database:', err.message);
  }
});

function initialize() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_kendaraan TEXT NOT NULL,
      tipe TEXT NOT NULL,
      nomor_polisi TEXT NOT NULL UNIQUE,
      odometer_saat_ini INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Maintenance_Logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      jenis_servis TEXT NOT NULL,
      tanggal DATE NOT NULL,
      biaya REAL NOT NULL,
      odometer_servis INTEGER NOT NULL,
      catatan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(vehicle_id) REFERENCES Vehicles(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Logistics_Trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      alamat_mulai TEXT NOT NULL,
      alamat_tujuan TEXT NOT NULL,
      status TEXT NOT NULL,
      tanggal_kirim DATE NOT NULL,
      estimated_distance_km REAL,
      estimated_duration_min REAL,
      distance_text TEXT,
      duration_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(vehicle_id) REFERENCES Vehicles(id)
    )`);

    db.run(`ALTER TABLE Logistics_Trips ADD COLUMN estimated_distance_km REAL`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error(err);
    });
    db.run(`ALTER TABLE Logistics_Trips ADD COLUMN estimated_duration_min REAL`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error(err);
    });
    db.run(`ALTER TABLE Logistics_Trips ADD COLUMN distance_text TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error(err);
    });
    db.run(`ALTER TABLE Logistics_Trips ADD COLUMN duration_text TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error(err);
    });

    db.run(`CREATE TABLE IF NOT EXISTS Vehicle_Locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(vehicle_id) REFERENCES Vehicles(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Fuel_Logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      tanggal DATE NOT NULL,
      jumlah_liter REAL NOT NULL,
      total_biaya REAL NOT NULL,
      odometer_saat_isi INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(vehicle_id) REFERENCES Vehicles(id)
    )`);
  });
}

module.exports = {
  db,
  initialize,
};
