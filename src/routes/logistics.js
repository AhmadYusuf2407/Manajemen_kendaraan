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
    const rows = await queryAll('SELECT * FROM Logistics_Trips ORDER BY tanggal_kirim DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await queryGet('SELECT * FROM Logistics_Trips WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Log trip tidak ditemukan' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { vehicle_id, alamat_mulai, alamat_tujuan, status, tanggal_kirim } = req.body;
    const result = await runQuery(
      'INSERT INTO Logistics_Trips (vehicle_id, alamat_mulai, alamat_tujuan, status, tanggal_kirim) VALUES (?, ?, ?, ?, ?)',
      [vehicle_id, alamat_mulai, alamat_tujuan, status, tanggal_kirim]
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { vehicle_id, alamat_mulai, alamat_tujuan, status, tanggal_kirim } = req.body;
    const result = await runQuery(
      'UPDATE Logistics_Trips SET vehicle_id = ?, alamat_mulai = ?, alamat_tujuan = ?, status = ?, tanggal_kirim = ? WHERE id = ?',
      [vehicle_id, alamat_mulai, alamat_tujuan, status, tanggal_kirim, req.params.id]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await runQuery('DELETE FROM Logistics_Trips WHERE id = ?', [req.params.id]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
