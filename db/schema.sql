-- Skema database untuk aplikasi Manajemen Kendaraan

CREATE TABLE IF NOT EXISTS Vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_kendaraan TEXT NOT NULL,
  tipe TEXT NOT NULL,
  nomor_polisi TEXT NOT NULL UNIQUE,
  odometer_saat_ini INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Maintenance_Logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  jenis_servis TEXT NOT NULL,
  tanggal DATE NOT NULL,
  biaya REAL NOT NULL,
  odometer_servis INTEGER NOT NULL,
  catatan TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(vehicle_id) REFERENCES Vehicles(id)
);

CREATE TABLE IF NOT EXISTS Logistics_Trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  alamat_mulai TEXT NOT NULL,
  alamat_tujuan TEXT NOT NULL,
  status TEXT NOT NULL,
  tanggal_kirim DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(vehicle_id) REFERENCES Vehicles(id)
);

CREATE TABLE IF NOT EXISTS Fuel_Logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  tanggal DATE NOT NULL,
  jumlah_liter REAL NOT NULL,
  total_biaya REAL NOT NULL,
  odometer_saat_isi INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(vehicle_id) REFERENCES Vehicles(id)
);
