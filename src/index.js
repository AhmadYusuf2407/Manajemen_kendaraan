const express = require('express');
const bodyParser = require('body-parser');
const db = require('./config/database');
const vehicleRoutes = require('./routes/vehicles');
const maintenanceRoutes = require('./routes/maintenance');
const logisticsRoutes = require('./routes/logistics');
const fuelRoutes = require('./routes/fuel');
const mapsRoutes = require('./routes/maps');
const dashboardRoutes = require('./routes/dashboard');

const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
// Serve static assets for PWA (manifest, icons, service worker)
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/vehicles', vehicleRoutes);
app.use('/maintenance', maintenanceRoutes);
app.use('/logistics', logisticsRoutes);
app.use('/fuel', fuelRoutes);
app.use('/maps', mapsRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Aplikasi Manajemen Kendaraan siap.' });
});

// Pastikan database dibuat dan tabel tersedia.
db.initialize();

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
