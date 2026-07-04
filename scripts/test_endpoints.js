(async () => {
  const base = 'http://localhost:3000';
  try {
    const stats = await (await fetch(base + '/dashboard/stats')).json();
    console.log('/dashboard/stats', stats);

    const trips = await (await fetch(base + '/dashboard/today-logistics')).json();
    console.log('/dashboard/today-logistics', trips);

    const vehicles = await (await fetch(base + '/maps/vehicles/locations')).json();
    console.log('/maps/vehicles/locations', vehicles);

    // Try to fetch a trip route (may fail if GOOGLE_MAPS_API_KEY not set)
    try {
      const tripRoute = await (await fetch(base + '/maps/trip/1')).json();
      console.log('/maps/trip/1', tripRoute);
    } catch (e) {
      console.warn('/maps/trip/1 request failed (likely missing API key):', e.message || e);
    }

    console.log('Endpoint test selesai');
  } catch (err) {
    console.error('Error testing endpoints:', err);
    process.exit(1);
  }
})();
