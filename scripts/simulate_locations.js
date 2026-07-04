(async () => {
  const base = 'http://localhost:3000';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const path = [
    { lat: -6.200, lng: 106.8166 },
    { lat: -6.201, lng: 106.8170 },
    { lat: -6.202, lng: 106.8180 },
    { lat: -6.203, lng: 106.8190 },
  ];

  console.log('Mulai simulasi lokasi untuk vehicle_id=1');
  for (const p of path) {
    const res = await fetch(base + '/maps/vehicle/1/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: p.lat, longitude: p.lng }),
    });
    const data = await res.json();
    console.log('Posted', data);
    await sleep(1000);
  }
  console.log('Simulasi selesai');
})();
