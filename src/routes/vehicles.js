const express = require('express');
const router = express.Router();
const maintenanceService = require('../services/maintenanceService');

router.get('/', async (req, res) => {
  try {
    const vehicles = await maintenanceService.getVehicles();
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vehicle = await maintenanceService.getVehicleById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Kendaraan tidak ditemukan' });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const result = await maintenanceService.createVehicle(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const result = await maintenanceService.updateVehicle(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await maintenanceService.deleteVehicle(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/maintenance-alert', async (req, res) => {
  try {
    const alert = await maintenanceService.getMaintenanceAlert(req.params.id);
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/monthly-expense', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'year dan month diperlukan' });
    }
    const expense = await maintenanceService.getMonthlyExpense(req.params.id, Number(year), Number(month));
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
