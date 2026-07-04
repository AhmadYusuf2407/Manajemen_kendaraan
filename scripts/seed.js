const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'data', 'manajemen_kendaraan.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params=[]) {
  return new Promise((resolve, reject) => db.run(sql, params, function(err){ if(err) reject(err); else resolve({lastID:this.lastID, changes:this.changes}); }));
}

async function seed() {
  try {
    // Vehicles
    await run("INSERT OR IGNORE INTO Vehicles (id, nama_kendaraan, tipe, nomor_polisi, odometer_saat_ini) VALUES (1, 'Toyota Avanza', 'MPV', 'B1234CD', 45000)");
    await run("INSERT OR IGNORE INTO Vehicles (id, nama_kendaraan, tipe, nomor_polisi, odometer_saat_ini) VALUES (2, 'Honda Jazz', 'Hatchback', 'B5678EF', 23000)");

    // Maintenance
    await run("INSERT INTO Maintenance_Logs (vehicle_id, jenis_servis, tanggal, biaya, odometer_servis, catatan) VALUES (1, 'Ganti oli', date('now','-60 days'), 350000, 42000, 'Service rutin')");

    // Fuel
    await run("INSERT INTO Fuel_Logs (vehicle_id, tanggal, jumlah_liter, total_biaya, odometer_saat_isi) VALUES (1, date('now','-30 days'), 40, 600000, 43000)");

    // Logistics trips
    await run("INSERT OR IGNORE INTO Logistics_Trips (id, vehicle_id, alamat_mulai, alamat_tujuan, status, tanggal_kirim) VALUES (1, 1, 'Kantor Pusat, Jakarta', 'Gudang A, Bekasi', 'on_route', date('now'))");
    await run("INSERT OR IGNORE INTO Logistics_Trips (id, vehicle_id, alamat_mulai, alamat_tujuan, status, tanggal_kirim) VALUES (2, 2, 'Depot, Jakarta', 'Toko B, Jakarta Selatan', 'pending', date('now'))");

    // Vehicle locations
    await run('INSERT INTO Vehicle_Locations (vehicle_id, latitude, longitude) VALUES (1, -6.200000, 106.816666)');
    await run('INSERT INTO Vehicle_Locations (vehicle_id, latitude, longitude) VALUES (2, -6.210000, 106.820000)');

    console.log('Seeding selesai');
    db.close();
  } catch (err) {
    console.error('Seed error:', err);
    db.close();
    process.exit(1);
  }
}

seed();
