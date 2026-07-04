const { db } = require('../config/database');

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function queryGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

async function getVehicles() {
  return queryAll('SELECT * FROM Vehicles ORDER BY id');
}

async function getVehicleById(id) {
  return queryGet('SELECT * FROM Vehicles WHERE id = ?', [id]);
}

async function createVehicle(data) {
  const { nama_kendaraan, tipe, nomor_polisi, odometer_saat_ini } = data;
  return runQuery(
    'INSERT INTO Vehicles (nama_kendaraan, tipe, nomor_polisi, odometer_saat_ini) VALUES (?, ?, ?, ?)',
    [nama_kendaraan, tipe, nomor_polisi, odometer_saat_ini]
  );
}

async function updateVehicle(id, data) {
  const { nama_kendaraan, tipe, nomor_polisi, odometer_saat_ini } = data;
  return runQuery(
    'UPDATE Vehicles SET nama_kendaraan = ?, tipe = ?, nomor_polisi = ?, odometer_saat_ini = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [nama_kendaraan, tipe, nomor_polisi, odometer_saat_ini, id]
  );
}

async function deleteVehicle(id) {
  return runQuery('DELETE FROM Vehicles WHERE id = ?', [id]);
}

async function getMaintenanceLogs(vehicleId = null) {
  const sql = vehicleId
    ? 'SELECT * FROM Maintenance_Logs WHERE vehicle_id = ? ORDER BY tanggal DESC'
    : 'SELECT * FROM Maintenance_Logs ORDER BY tanggal DESC';
  return queryAll(sql, vehicleId ? [vehicleId] : []);
}

async function getMaintenanceLogById(id) {
  return queryGet('SELECT * FROM Maintenance_Logs WHERE id = ?', [id]);
}

async function createMaintenanceLog(data) {
  const { vehicle_id, jenis_servis, tanggal, biaya, odometer_servis, catatan } = data;
  return runQuery(
    'INSERT INTO Maintenance_Logs (vehicle_id, jenis_servis, tanggal, biaya, odometer_servis, catatan) VALUES (?, ?, ?, ?, ?, ?)',
    [vehicle_id, jenis_servis, tanggal, biaya, odometer_servis, catatan]
  );
}

async function updateMaintenanceLog(id, data) {
  const { vehicle_id, jenis_servis, tanggal, biaya, odometer_servis, catatan } = data;
  return runQuery(
    'UPDATE Maintenance_Logs SET vehicle_id = ?, jenis_servis = ?, tanggal = ?, biaya = ?, odometer_servis = ?, catatan = ? WHERE id = ?',
    [vehicle_id, jenis_servis, tanggal, biaya, odometer_servis, catatan, id]
  );
}

async function deleteMaintenanceLog(id) {
  return runQuery('DELETE FROM Maintenance_Logs WHERE id = ?', [id]);
}

async function getLastMaintenance(vehicleId) {
  return queryGet(
    'SELECT * FROM Maintenance_Logs WHERE vehicle_id = ? ORDER BY tanggal DESC, id DESC LIMIT 1',
    [vehicleId]
  );
}

function maintenanceAlert(vehicle, lastMaintenance) {
  if (!vehicle) return { status: 'Unknown', message: 'Data kendaraan tidak ditemukan' };
  if (!lastMaintenance) {
    return { status: 'Butuh Servis', message: 'Belum ada riwayat servis, segera lakukan pemeriksaan.' };
  }

  const currentOdometer = vehicle.odometer_saat_ini;
  const nextServiceOdometer = lastMaintenance.odometer_servis + 3000;
  const lastServiceDate = new Date(lastMaintenance.tanggal);
  const thresholdDate = new Date(lastServiceDate);
  thresholdDate.setMonth(thresholdDate.getMonth() + 4);
  const now = new Date();

  const isOdometerDue = currentOdometer >= nextServiceOdometer;
  const isTimeDue = now >= thresholdDate;

  if (isOdometerDue || isTimeDue) {
    const reasons = [];
    if (isOdometerDue) reasons.push(`Odometer sudah melewati ${nextServiceOdometer} km`);
    if (isTimeDue) reasons.push('Waktu lebih dari 4 bulan sejak servis terakhir');
    return {
      status: 'Butuh Servis',
      message: reasons.join(' dan '),
      nextServiceOdometer,
      lastServiceDate: lastServiceDate.toISOString().split('T')[0],
    };
  }

  return {
    status: 'Aman',
    message: 'Kendaraan masih dalam batas servis normal.',
    nextServiceOdometer,
    lastServiceDate: lastServiceDate.toISOString().split('T')[0],
  };
}

async function getMaintenanceAlert(vehicleId) {
  const vehicle = await getVehicleById(vehicleId);
  const lastMaintenance = await getLastMaintenance(vehicleId);
  return maintenanceAlert(vehicle, lastMaintenance);
}

async function getMonthlyExpense(vehicleId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

  const maintenanceRows = await queryAll(
    'SELECT SUM(biaya) as total_maintenance FROM Maintenance_Logs WHERE vehicle_id = ? AND tanggal BETWEEN ? AND ?',
    [vehicleId, startDate, endDate]
  );

  const fuelRows = await queryAll(
    'SELECT SUM(total_biaya) as total_fuel FROM Fuel_Logs WHERE vehicle_id = ? AND tanggal BETWEEN ? AND ?',
    [vehicleId, startDate, endDate]
  );

  const totalMaintenance = maintenanceRows[0]?.total_maintenance || 0;
  const totalFuel = fuelRows[0]?.total_fuel || 0;

  return {
    vehicle_id: vehicleId,
    year,
    month,
    total_maintenance: totalMaintenance,
    total_fuel: totalFuel,
    total_pengeluaran: Number(totalMaintenance) + Number(totalFuel),
  };
}

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getMaintenanceLogs,
  getMaintenanceLogById,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
  getLastMaintenance,
  getMaintenanceAlert,
  getMonthlyExpense,
};
