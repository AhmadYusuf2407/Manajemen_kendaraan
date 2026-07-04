const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

function queryGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
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

function decodePolyline(str) {
  let index = 0;
  const coordinates = [];
  let lat = 0;
  let lng = 0;

  while (index < str.length) {
    let result = 0;
    let shift = 0;
    let byte = null;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Maps API request gagal: ${response.status}`);
  }
  return response.json();
}

async function getTripById(id) {
  return queryGet('SELECT * FROM Logistics_Trips WHERE id = ?', [id]);
}

async function getDirections(origin, destination) {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;
  const data = await fetchJson(url);
  if (data.status !== 'OK') {
    throw new Error(`Directions API error: ${data.status} - ${data.error_message || 'no message'}`);
  }
  return data.routes[0];
}

async function getDistanceMatrix(origin, destination) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&units=metric`;
  const data = await fetchJson(url);
  if (data.status !== 'OK') {
    throw new Error(`Distance Matrix API error: ${data.status} - ${data.error_message || 'no message'}`);
  }
  const element = data.rows[0].elements[0];
  if (element.status !== 'OK') {
    throw new Error(`Distance Matrix element error: ${element.status}`);
  }
  return element;
}

async function getLatestVehicleLocation(vehicleId) {
  return queryGet('SELECT latitude, longitude FROM Vehicle_Locations WHERE vehicle_id = ? ORDER BY recorded_at DESC LIMIT 1', [vehicleId]);
}

function haversineDistanceMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const lat1 = a.lat;
  const lon1 = a.lng;
  const lat2 = b.lat;
  const lon2 = b.lng;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const u = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(u), Math.sqrt(1-u));
  return R * c;
}

router.get('/trip/:id', async (req, res) => {
  try {
    const trip = await getTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip logistik tidak ditemukan' });

    if (GOOGLE_MAPS_API_KEY) {
      const route = await getDirections(trip.alamat_mulai, trip.alamat_tujuan);
      const leg = route.legs[0];
      const polyline = route.overview_polyline.points;
      const points = decodePolyline(polyline);

      res.json({
        trip,
        route: {
          overview_polyline: polyline,
          points,
          distance_text: leg.distance.text,
          distance_meters: leg.distance.value,
          duration_text: leg.duration.text,
          duration_seconds: leg.duration.value,
        },
      });
    } else {
      // Fallback: build a simple synthetic route using latest vehicle location
      const latest = await getLatestVehicleLocation(trip.vehicle_id);
      const start = latest ? { lat: latest.latitude, lng: latest.longitude } : { lat: -6.200000, lng: 106.816666 };
      // deterministic end based on trip id
      const offset = 0.02 + (Number(trip.id || 0) % 5) * 0.005;
      const end = { lat: start.lat + offset, lng: start.lng + offset };
      const mid = { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 };
      const points = [start, mid, end];
      const distance_m = Math.round(haversineDistanceMeters(start, end));
      const duration_s = Math.max(60, Math.round(distance_m / (40 / 3.6))); // assume 40 km/h

      res.json({
        trip,
        route: {
          overview_polyline: '',
          points,
          distance_text: (distance_m / 1000).toFixed(2) + ' km',
          distance_meters: distance_m,
          duration_text: Math.round(duration_s / 60) + ' mnt',
          duration_seconds: duration_s,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function getVehicleById(id) {
  return queryGet('SELECT * FROM Vehicles WHERE id = ?', [id]);
}

router.post('/vehicle/:id/location', async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude dan longitude diperlukan' });
    }

    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Kendaraan tidak ditemukan' });

    const result = await runQuery(
      'INSERT INTO Vehicle_Locations (vehicle_id, latitude, longitude) VALUES (?, ?, ?)',
      [vehicleId, latitude, longitude]
    );

    res.status(201).json({
      ...result,
      vehicle_id: Number(vehicleId),
      latitude,
      longitude,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vehicle/:id/location', async (req, res) => {
  try {
    const location = await queryGet(
      'SELECT * FROM Vehicle_Locations WHERE vehicle_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [req.params.id]
    );
    if (!location) return res.status(404).json({ error: 'Lokasi kendaraan tidak ditemukan' });
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vehicle/:id/locations', async (req, res) => {
  try {
    const rows = await queryAll(
      'SELECT * FROM Vehicle_Locations WHERE vehicle_id = ? ORDER BY recorded_at DESC LIMIT 100',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vehicles/locations', async (req, res) => {
  try {
    const statusFilter = req.query.status;
    let sql = `SELECT vl.id, vl.vehicle_id, vl.latitude, vl.longitude, vl.recorded_at, v.nama_kendaraan, v.nomor_polisi, lt.status, lt.id AS trip_id
       FROM Vehicle_Locations vl
       JOIN (SELECT vehicle_id, MAX(recorded_at) AS max_time FROM Vehicle_Locations GROUP BY vehicle_id) latest
         ON vl.vehicle_id = latest.vehicle_id AND vl.recorded_at = latest.max_time
       LEFT JOIN Vehicles v ON v.id = vl.vehicle_id
       LEFT JOIN Logistics_Trips lt ON lt.vehicle_id = vl.vehicle_id AND lt.id = (
         SELECT MAX(id) FROM Logistics_Trips t2 WHERE t2.vehicle_id = vl.vehicle_id
       )`;
    const params = [];
    if (statusFilter) {
      sql += ` WHERE lt.status = ?`;
      params.push(statusFilter);
    }
    sql += ` ORDER BY vl.vehicle_id`;

    const rows = await queryAll(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/trip/:id/estimate', async (req, res) => {
  try {
    const trip = await getTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip logistik tidak ditemukan' });

    if (GOOGLE_MAPS_API_KEY) {
      const element = await getDistanceMatrix(trip.alamat_mulai, trip.alamat_tujuan);
      const estimatedDistanceKm = element.distance.value / 1000;
      const estimatedDurationMin = element.duration.value / 60;

      const result = await runQuery(
        'UPDATE Logistics_Trips SET estimated_distance_km = ?, estimated_duration_min = ?, distance_text = ?, duration_text = ? WHERE id = ?',
        [estimatedDistanceKm, estimatedDurationMin, element.distance.text, element.duration.text, req.params.id]
      );

      res.json({
        ...result,
        trip_id: Number(req.params.id),
        estimated_distance_km: estimatedDistanceKm,
        estimated_duration_min: estimatedDurationMin,
        distance_text: element.distance.text,
        duration_text: element.duration.text,
      });
    } else {
      // Fallback compute using latest vehicle location
      const latest = await getLatestVehicleLocation(trip.vehicle_id);
      const start = latest ? { lat: latest.latitude, lng: latest.longitude } : { lat: -6.200000, lng: 106.816666 };
      const offset = 0.02 + (Number(trip.id || 0) % 5) * 0.005;
      const end = { lat: start.lat + offset, lng: start.lng + offset };
      const distanceMeters = Math.round(haversineDistanceMeters(start, end));
      const durationMin = Math.max(1, Math.round((distanceMeters / (40 / 3.6)) / 60));

      const result = await runQuery(
        'UPDATE Logistics_Trips SET estimated_distance_km = ?, estimated_duration_min = ?, distance_text = ?, duration_text = ? WHERE id = ?',
        [distanceMeters / 1000, durationMin, (distanceMeters/1000).toFixed(2) + ' km', durationMin + ' mnt', req.params.id]
      );

      res.json({
        ...result,
        trip_id: Number(req.params.id),
        estimated_distance_km: distanceMeters / 1000,
        estimated_duration_min: durationMin,
        distance_text: (distanceMeters/1000).toFixed(2) + ' km',
        duration_text: durationMin + ' mnt',
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/page', (req, res) => {
  const apiKey = GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#1976d2">
  <title>Peta Manajemen Kendaraan</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    #toolbar { padding: 16px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    #map { width: 100%; height: 70vh; }
    #info { padding: 16px; }
    input, button { font-size: 1rem; padding: 8px; margin-right: 8px; }
  </style>
</head>
<body>
  <div id="toolbar">
    <label for="vehicleId">Vehicle ID:</label>
    <input id="vehicleId" type="number" value="1" min="1" style="width: 80px;" />
    <button onclick="reportLocation()">Kirim Posisi Saat Ini</button>
    <button onclick="loadActiveVehicles()">Tampilkan Kendaraan Aktif</button>
    <label for="statusFilter" style="margin-left: 16px;">Status:</label>
    <select id="statusFilter">
      <option value="">Semua</option>
      <option value="pending">pending</option>
      <option value="on_route">on_route</option>
      <option value="delivered">delivered</option>
    </select>
    <label for="tripId" style="margin-left: 16px;">Trip ID:</label>
    <input id="tripId" type="number" value="1" min="1" style="width: 80px;" />
    <button onclick="loadTrip()">Muat Rute</button>
    <button onclick="updateEstimate()">Perbarui Estimasi Jarak & ETA</button>
  </div>
  <div id="legend" style="padding: 12px; background: rgba(255,255,255,0.95); position: absolute; top: 100px; left: 16px; z-index: 5; border: 1px solid #ccc; border-radius: 8px;">
    <strong>Legend Status</strong>
    <div><span style="display:inline-block;width:12px;height:12px;margin-right:8px;background:#f44336;"></span> pending</div>
    <div><span style="display:inline-block;width:12px;height:12px;margin-right:8px;background:#ff9800;"></span> on_route</div>
    <div><span style="display:inline-block;width:12px;height:12px;margin-right:8px;background:#4caf50;"></span> delivered</div>
  </div>
  <div id="map"></div>
  <div id="info"></div>
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap" async defer></script>
  <script>
    let map;
    let currentMarker;
    let routePath;
    let startMarker;
    let endMarker;
    let infoWindow;

    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -6.200000, lng: 106.816666 },
        zoom: 12,
      });
      infoWindow = new google.maps.InfoWindow();

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const current = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          currentMarker = new google.maps.Marker({
            position: current,
            map,
            title: 'Posisi Anda',
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#1976d2', fillOpacity: 1, strokeWeight: 2, strokeColor: '#fff' },
          });
          map.setCenter(current);
        }, () => {
          setInfo('Geolocation tidak tersedia atau ditolak.');
        });
      } else {
        setInfo('Browser tidak mendukung geolocation.');
      }
    }

    function setInfo(message) {
      document.getElementById('info').innerText = message;
    }

    async function loadTrip() {
      const id = document.getElementById('tripId').value;
      setInfo('Memuat data trip...');

      try {
        const response = await fetch('/maps/trip/' + id);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Gagal memuat trip');
        }
        const data = await response.json();
        renderRoute(data);
      } catch (err) {
        setInfo(err.message);
      }
    }

    function renderRoute(data) {
      const points = data.route.points.map((p) => ({ lat: p.lat, lng: p.lng }));
      if (routePath) routePath.setMap(null);
      if (startMarker) startMarker.setMap(null);
      if (endMarker) endMarker.setMap(null);

      routePath = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: '#1976d2',
        strokeOpacity: 0.8,
        strokeWeight: 5,
      });
      routePath.setMap(map);

      startMarker = new google.maps.Marker({
        position: points[0],
        map,
        label: 'A',
        title: 'Alamat Mulai',
      });

      endMarker = new google.maps.Marker({
        position: points[points.length - 1],
        map,
        label: 'B',
        title: 'Alamat Tujuan',
      });

      const routeInfo = 'Trip ID: ' + data.trip.id + '<br>' +
        'Mulai: ' + data.trip.alamat_mulai + '<br>' +
        'Tujuan: ' + data.trip.alamat_tujuan + '<br>' +
        'Jarak rute: ' + data.route.distance_text + '<br>' +
        'Durasi rute: ' + data.route.duration_text;

      infoWindow.setContent(routeInfo);
      infoWindow.setPosition(points[0]);
      infoWindow.open(map);

      map.fitBounds(new google.maps.LatLngBounds().extend(points[0]).extend(points[points.length - 1]));
      setInfo('Trip ID: ' + data.trip.id + '\n' +
        'Mulai: ' + data.trip.alamat_mulai + '\n' +
        'Tujuan: ' + data.trip.alamat_tujuan + '\n' +
        'Jarak rute: ' + data.route.distance_text + '\n' +
        'Durasi rute: ' + data.route.duration_text);
    }

    let activeVehicleMarkers = [];

    async function reportLocation() {
      const vehicleId = document.getElementById('vehicleId').value;
      setInfo('Mengirim posisi kendaraan...');

      if (!navigator.geolocation) {
        return setInfo('Browser tidak mendukung geolocation.');
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const response = await fetch('/maps/vehicle/' + vehicleId + '/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Gagal mengirim lokasi');
          }
          const data = await response.json();
          setInfo('Lokasi disimpan: (' + data.latitude + ', ' + data.longitude + ') pada kendaraan ' + data.vehicle_id);
          if (currentMarker) {
            currentMarker.setPosition({ lat: data.latitude, lng: data.longitude });
          }
        } catch (err) {
          setInfo(err.message);
        }
      }, () => {
        setInfo('Tidak dapat memperoleh lokasi saat ini.');
      });
    }

    function clearActiveVehicleMarkers() {
      activeVehicleMarkers.forEach((marker) => marker.setMap(null));
      activeVehicleMarkers = [];
    }

    async function loadActiveVehicles() {
      setInfo('Memuat kendaraan aktif...');
      try {
        const status = document.getElementById('statusFilter').value;
        const url = status ? '/maps/vehicles/locations?status=' + encodeURIComponent(status) : '/maps/vehicles/locations';
        const response = await fetch(url);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Gagal memuat kendaraan aktif');
        }
        const vehicles = await response.json();
        clearActiveVehicleMarkers();
        const bounds = new google.maps.LatLngBounds();

        vehicles.forEach((vehicle) => {
          const statusColor = vehicle.status === 'pending' ? '#f44336' : vehicle.status === 'on_route' ? '#ff9800' : vehicle.status === 'delivered' ? '#4caf50' : '#1976d2';
        const marker = new google.maps.Marker({
            position: { lat: vehicle.latitude, lng: vehicle.longitude },
            map,
            title: (vehicle.nama_kendaraan || 'Kendaraan') + ' (' + (vehicle.nomor_polisi || 'N/A') + ') - ' + (vehicle.status || 'status tidak diketahui'),
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: statusColor,
              fillOpacity: 0.9,
              strokeWeight: 1,
              strokeColor: '#ffffff',
            },
            label: {
              text: String(vehicle.vehicle_id),
              color: '#ffffff',
              fontWeight: 'bold',
            },
          });

          const contentString = 'Vehicle ' + vehicle.vehicle_id + '<br>' +
            'Nama: ' + (vehicle.nama_kendaraan || 'N/A') + '<br>' +
            'Plat: ' + (vehicle.nomor_polisi || 'N/A') + '<br>' +
            'Status: ' + (vehicle.status || 'N/A') + '<br>' +
            'Trip ID: ' + (vehicle.trip_id || 'N/A') + '<br>' +
            'Waktu: ' + vehicle.recorded_at;

          marker.addListener('click', () => {
            infoWindow.setContent(contentString);
            infoWindow.open(map, marker);
          });

          activeVehicleMarkers.push(marker);
          bounds.extend(marker.getPosition());
        });

        if (vehicles.length) {
          map.fitBounds(bounds);
          setInfo('Menampilkan ' + vehicles.length + ' kendaraan aktif.');
        } else {
          setInfo('Tidak ada kendaraan aktif yang ditemukan.');
        }
      } catch (err) {
        setInfo(err.message);
      }
    }

    async function updateEstimate() {
      const id = document.getElementById('tripId').value;
      setInfo('Menghitung estimasi jarak dan waktu...');

      try {
        const response = await fetch('/maps/trip/' + id + '/estimate', { method: 'POST' });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Gagal menghitung estimasi');
        }
        const data = await response.json();
        setInfo('Estimasi jarak: ' + data.distance_text + ' (' + data.estimated_distance_km.toFixed(2) + ' km)\nEstimasi durasi: ' + data.duration_text + ' (' + data.estimated_duration_min.toFixed(1) + ' menit)');
      } catch (err) {
        setInfo(err.message);
      }
    }

    window.initMap = initMap;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW register failed', e));
    }
  </script>
</body>
</html>
`);
});

module.exports = router;
