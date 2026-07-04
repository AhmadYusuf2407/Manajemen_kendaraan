const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const maintenanceService = require('../services/maintenanceService');

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

function formatMonth(month) {
  return month.toString().padStart(2, '0');
}

router.get('/stats', async (req, res) => {
  try {
    const vehicles = await maintenanceService.getVehicles();
    let amanCount = 0;
    let butuhServisCount = 0;
    const vehiclesWithStatus = [];

    for (const vehicle of vehicles) {
      const alert = await maintenanceService.getMaintenanceAlert(vehicle.id);
      if (alert.status === 'Aman') amanCount += 1;
      else butuhServisCount += 1;
      vehiclesWithStatus.push({
        id: vehicle.id,
        nama_kendaraan: vehicle.nama_kendaraan,
        tipe: vehicle.tipe,
        nomor_polisi: vehicle.nomor_polisi,
        status_servis: alert.status,
        message: alert.message,
      });
    }

    res.json({
      total_vehicles: vehicles.length,
      status: {
        Aman: amanCount,
        Butuh_Servis: butuhServisCount,
      },
      vehicles: vehiclesWithStatus,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/today-logistics', async (req, res) => {
  try {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${formatMonth(today.getMonth() + 1)}-${formatMonth(today.getDate())}`;
    const rows = await queryAll(
      `SELECT lt.id, lt.vehicle_id, lt.alamat_mulai, lt.alamat_tujuan, lt.status, lt.tanggal_kirim, lt.estimated_distance_km, lt.estimated_duration_min, v.nama_kendaraan, v.nomor_polisi
       FROM Logistics_Trips lt
       JOIN Vehicles v ON v.id = lt.vehicle_id
       WHERE lt.status = 'on_route' AND lt.tanggal_kirim = ?
       ORDER BY lt.id ASC`,
      [dateString]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/expenses', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => formatMonth(m));

    const maintenanceRows = await queryAll(
      `SELECT strftime('%m', tanggal) AS month, SUM(biaya) AS total_maintenance
       FROM Maintenance_Logs
       WHERE strftime('%Y', tanggal) = ?
       GROUP BY month`,
      [String(year)]
    );
    const fuelRows = await queryAll(
      `SELECT strftime('%m', tanggal) AS month, SUM(total_biaya) AS total_fuel
       FROM Fuel_Logs
       WHERE strftime('%Y', tanggal) = ?
       GROUP BY month`,
      [String(year)]
    );

    const maintenanceMap = {};
    maintenanceRows.forEach((row) => {
      maintenanceMap[row.month] = row.total_maintenance || 0;
    });

    const fuelMap = {};
    fuelRows.forEach((row) => {
      fuelMap[row.month] = row.total_fuel || 0;
    });

    const data = months.map((month) => ({
      month,
      total_maintenance: Number(maintenanceMap[month] || 0),
      total_fuel: Number(fuelMap[month] || 0),
    }));

    res.json({ year: Number(year), data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/page', (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#1976d2">
  <title>Dashboard Manajemen Kendaraan</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f6f8; }
    header { padding: 20px; background: #1976d2; color: #fff; }
    .container { max-width: 1200px; margin: 24px auto; padding: 0 24px; }
    .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.08); padding: 20px; }
    .card h3 { margin-top: 0; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; }
    .stat { flex: 1 1 120px; background: #e3f2fd; border-radius: 12px; padding: 16px; text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #eceff1; }
    th { background: #f5f5f5; }
    #mini-map { width: 100%; height: 240px; border-radius: 12px; }
    #chartContainer { width: 100%; height: 320px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; color: #fff; font-size: 0.85rem; }
    .badge.aman { background: #4caf50; }
    .badge.butuh { background: #f44336; }
    .badge.on_route { background: #ff9800; }
  </style>
</head>
<body>
  <header>
    <h1>Dashboard Manajemen Kendaraan</h1>
  </header>
  <div class="container">
    <section class="grid">
      <div class="card">
        <h3>Ringkasan Kendaraan</h3>
        <div class="stats">
          <div class="stat"><strong id="totalVehicles">0</strong><div>Total Kendaraan</div></div>
          <div class="stat"><strong id="amanCount">0</strong><div>Aman</div></div>
          <div class="stat"><strong id="butuhServisCount">0</strong><div>Butuh Servis</div></div>
        </div>
      </div>
      <div class="card">
        <h3>Pengeluaran Bulanan</h3>
        <canvas id="expenseChart"></canvas>
      </div>
    </section>

    <section class="grid" style="margin-top: 20px;">
      <div class="card" style="grid-column: span 2;">
        <h3>Perjalanan Logistik Hari Ini (on_route)</h3>
        <table>
          <thead>
            <tr>
              <th>ID Trip</th>
              <th>Kendaraan</th>
              <th>Mulai</th>
              <th>Tujuan</th>
              <th>Jarak</th>
              <th>Durasi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody id="tripTableBody">
            <tr><td colspan="7">Memuat...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>Peta Mini</h3>
        <div id="mini-map"></div>
      </div>
    </section>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://maps.googleapis.com/maps/api/js?key=" + apiKey + "&callback=initMiniMap" async defer></script>
  <script>
    let miniMap;
    let miniRoute;
    let startMarker;
    let endMarker;
    let infoWindow;

    function initMiniMap() {
      miniMap = new google.maps.Map(document.getElementById('mini-map'), {
        center: { lat: -6.200000, lng: 106.816666 },
        zoom: 11,
      });
      infoWindow = new google.maps.InfoWindow();
    }

    function numberFormat(value) {
      return value.toLocaleString('id-ID');
    }

    async function loadDashboard() {
      loadStats();
      loadTrips();
      loadExpenses();
    }

    async function loadStats() {
      const response = await fetch('/dashboard/stats');
      const data = await response.json();
      document.getElementById('totalVehicles').innerText = data.total_vehicles;
      document.getElementById('amanCount').innerText = data.status.Aman;
      document.getElementById('butuhServisCount').innerText = data.status.Butuh_Servis;
    }

    async function loadTrips() {
      const response = await fetch('/dashboard/today-logistics');
      const trips = await response.json();
      const body = document.getElementById('tripTableBody');
      body.innerHTML = '';
      if (!trips.length) {
        body.innerHTML = '<tr><td colspan="7">Tidak ada perjalanan on_route hari ini.</td></tr>';
        return;
      }

      trips.forEach((trip) => {
        const row = document.createElement('tr');
        row.innerHTML =
          '<td>' + trip.id + '</td>' +
          '<td>' + trip.nama_kendaraan + ' (' + trip.nomor_polisi + ')</td>' +
          '<td>' + trip.alamat_mulai + '</td>' +
          '<td>' + trip.alamat_tujuan + '</td>' +
          '<td>' + (trip.estimated_distance_km ? trip.estimated_distance_km.toFixed(1) + ' km' : '-') + '</td>' +
          '<td>' + (trip.estimated_duration_min ? trip.estimated_duration_min.toFixed(1) + ' mnt' : '-') + '</td>' +
          '<td><button onclick="showTripOnMiniMap(' + trip.id + ')">Lihat</button></td>';
        body.appendChild(row);
      });
    }

    async function loadExpenses() {
      const now = new Date();
      const response = await fetch('/dashboard/expenses?year=' + now.getFullYear());
      const data = await response.json();
      const labels = data.data.map((item) => item.month);
      const maintenanceData = data.data.map((item) => item.total_maintenance);
      const fuelData = data.data.map((item) => item.total_fuel);

      const ctx = document.getElementById('expenseChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Servis',
              backgroundColor: '#1976d2',
              data: maintenanceData,
            },
            {
              label: 'Bensin',
              backgroundColor: '#ff9800',
              data: fuelData,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            x: { stacked: true },
            y: { stacked: false, beginAtZero: true, title: { display: true, text: 'Biaya (IDR)' } },
          },
        },
      });
    }

    async function showTripOnMiniMap(tripId) {
      const response = await fetch('/maps/trip/' + tripId);
      if (!response.ok) {
        alert('Gagal memuat rute trip');
        return;
      }
      const data = await response.json();
      const points = data.route.points.map((p) => ({ lat: p.lat, lng: p.lng }));

      if (miniRoute) miniRoute.setMap(null);
      if (startMarker) startMarker.setMap(null);
      if (endMarker) endMarker.setMap(null);

      miniRoute = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: '#4caf50',
        strokeOpacity: 0.8,
        strokeWeight: 4,
      });
      miniRoute.setMap(miniMap);

      startMarker = new google.maps.Marker({
        position: points[0],
        map: miniMap,
        label: 'A',
      });
      endMarker = new google.maps.Marker({
        position: points[points.length - 1],
        map: miniMap,
        label: 'B',
      });

      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      miniMap.fitBounds(bounds);

      infoWindow.setContent('Trip ' + data.trip.id + '<br>' + data.trip.alamat_mulai + '<br>→ ' + data.trip.alamat_tujuan + '<br>' + data.route.distance_text + ', ' + data.route.duration_text);
      infoWindow.setPosition(points[0]);
      infoWindow.open(miniMap);
    }

    window.initMiniMap = initMiniMap;
    window.showTripOnMiniMap = showTripOnMiniMap;
    loadDashboard();
  </script>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW register failed', e));
    }
  </script>
</body>
</html>
`);
});

module.exports = router;
