const express = require('express');
const router = express.Router();
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

router.get('/', async (req, res) => {
  try {
    const rows = await queryAll('SELECT * FROM Fuel_Logs ORDER BY tanggal DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await queryGet('SELECT * FROM Fuel_Logs WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Fuel log tidak ditemukan' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { vehicle_id, tanggal, jumlah_liter, total_biaya, odometer_saat_isi } = req.body;
    const result = await runQuery(
      'INSERT INTO Fuel_Logs (vehicle_id, tanggal, jumlah_liter, total_biaya, odometer_saat_isi) VALUES (?, ?, ?, ?, ?)',
      [vehicle_id, tanggal, jumlah_liter, total_biaya, odometer_saat_isi]
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { vehicle_id, tanggal, jumlah_liter, total_biaya, odometer_saat_isi } = req.body;
    const result = await runQuery(
      'UPDATE Fuel_Logs SET vehicle_id = ?, tanggal = ?, jumlah_liter = ?, total_biaya = ?, odometer_saat_isi = ? WHERE id = ?',
      [vehicle_id, tanggal, jumlah_liter, total_biaya, odometer_saat_isi, req.params.id]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await runQuery('DELETE FROM Fuel_Logs WHERE id = ?', [req.params.id]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
