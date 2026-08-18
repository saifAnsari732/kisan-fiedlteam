import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  isUsingMongo,
  findUserByEmailOrName,
  findUserById,
  createUser,
  getReportsByUser,
  createReport,
  deleteReport
} from './server/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Database (MongoDB with local fallback)
  await initDatabase();

  // --- API Routes ---

  // Health & DB status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      db: isUsingMongo() ? 'MongoDB (Mongoose)' : 'Local Persistent Storage',
      timestamp: new Date().toISOString()
    });
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { usernameOrEmail, password } = req.body;
      if (!usernameOrEmail || !password) {
        return res.status(400).json({ error: 'Username/Email and Password are required.' });
      }

      const user = await findUserByEmailOrName(usernameOrEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials. User not found.' });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid password.' });
      }

      return res.json({
        success: true,
        user: {
          id: user._id.toString(),
          _id: user._id.toString(),
          name: user.name,
          email: user.email
        }
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Server error during login.' });
    }
  });

  // Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      const existing = await findUserByEmailOrName(email);
      if (existing) {
        return res.status(400).json({ error: 'An account with this email or username already exists.' });
      }

      const newUser = await createUser({ name, email, password });
      return res.status(201).json({
        success: true,
        user: {
          id: newUser._id.toString(),
          _id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email
        }
      });
    } catch (err: any) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Failed to create user account.' });
    }
  });

  // Get current user info
  app.get('/api/auth/me', async (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const user = await findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        user: {
          id: user._id.toString(),
          _id: user._id.toString(),
          name: user.name,
          email: user.email
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
  });

  // Google Maps API Key
  const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCgmGEomqsMzK3Fcx5Q4eVj8yWLkBBrbbA';

  // 1. Google Geolocation API (Gets high-accuracy current location via Google)
  app.post('/api/geolocation/google', async (req, res) => {
    try {
      const googleGeoUrl = `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_MAPS_KEY}`;
      const geoRes = await fetch(googleGeoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ considerIp: true })
      });

      if (geoRes.ok) {
        const geoData = (await geoRes.json()) as any;
        if (geoData.location) {
          const lat = geoData.location.lat;
          const lng = geoData.location.lng;
          const accuracy = geoData.accuracy || 50;

          // Also reverse-geocode to get readable address
          const reverseUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}&language=en`;
          const revRes = await fetch(reverseUrl);
          let formattedAddress = `${lat}, ${lng}`;
          let postcode = null;
          let city = null;

          if (revRes.ok) {
            const revData = (await revRes.json()) as any;
            if (revData.results && revData.results.length > 0) {
              formattedAddress = revData.results[0].formatted_address;
              const comps = revData.results[0].address_components || [];
              for (const c of comps) {
                if (c.types.includes('postal_code')) postcode = c.long_name;
                if (c.types.includes('locality')) city = c.long_name;
              }
            }
          }

          return res.json({
            success: true,
            latitude: lat,
            longitude: lng,
            accuracy,
            address: formattedAddress,
            postcode,
            city,
            source: 'Google Geolocation API'
          });
        }
      }
      return res.status(500).json({ error: 'Could not resolve location via Google Geolocation.' });
    } catch (err: any) {
      console.error('Google Geolocation API error:', err);
      return res.status(500).json({ error: 'Failed to fetch location from Google Geolocation API.' });
    }
  });

  // 2. Google Maps Reverse Geocoding Proxy (converts Lat/Lng to real, high-accuracy address)
  app.get('/api/geocode/reverse', async (req, res) => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude (lat) and Longitude (lng) are required.' });
      }

      const numLat = parseFloat(lat as string);
      const numLng = parseFloat(lng as string);

      if (isNaN(numLat) || isNaN(numLng)) {
        return res.status(400).json({ error: 'Invalid latitude or longitude numbers.' });
      }

      // Priority 1: Google Maps Geocoding API
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(numLat)},${encodeURIComponent(numLng)}&key=${GOOGLE_MAPS_KEY}&language=en`;
        const googleRes = await fetch(googleUrl);
        if (googleRes.ok) {
          const googleData = (await googleRes.json()) as any;
          if (googleData.status === 'OK' && googleData.results && googleData.results.length > 0) {
            const bestResult = googleData.results[0];
            const comps = bestResult.address_components || [];
            
            let postcode = null;
            let city = null;
            let state = null;
            let country = null;
            let sublocality = null;
            let route = null;

            for (const c of comps) {
              if (c.types.includes('postal_code')) postcode = c.long_name;
              if (c.types.includes('locality')) city = c.long_name;
              if (c.types.includes('administrative_area_level_1')) state = c.long_name;
              if (c.types.includes('country')) country = c.long_name;
              if (c.types.includes('sublocality') || c.types.includes('sublocality_level_1')) sublocality = c.long_name;
              if (c.types.includes('route')) route = c.long_name;
            }

            return res.json({
              success: true,
              address: bestResult.formatted_address,
              fullDisplayName: bestResult.formatted_address,
              postcode: postcode || null,
              city: city || sublocality || null,
              state: state || null,
              country: country || null,
              source: 'Google Maps Geocoding API',
              results: googleData.results.slice(0, 3)
            });
          }
        }
      } catch (gErr) {
        console.warn('Google Maps geocoding call failed, falling back to OSM:', gErr);
      }

      // Fallback: OpenStreetMap Nominatim
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(numLat)}&lon=${encodeURIComponent(numLng)}&addressdetails=1`;
      const geoRes = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'FieldOpsClientReportApp/1.0 (internal-field-ops)',
          'Accept-Language': 'en,hi'
        }
      });

      if (geoRes.ok) {
        const geoData = (await geoRes.json()) as any;
        const addr = geoData.address || {};
        const street = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || '';
        const area = addr.suburb || addr.neighbourhood || addr.city_district || '';
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
        const state = addr.state || addr.region || '';
        const postcode = addr.postcode || '';
        const country = addr.country || '';

        const parts = [street, area, city, state, postcode, country].filter((p, idx, self) => Boolean(p) && self.indexOf(p) === idx);
        const cleanAddress = parts.length > 0 ? parts.join(', ') : geoData.display_name || `${numLat}, ${numLng}`;

        return res.json({
          success: true,
          address: cleanAddress,
          fullDisplayName: geoData.display_name || cleanAddress,
          postcode: postcode || null,
          city: city || null,
          state: state || null,
          country: country || null,
          source: 'OpenStreetMap Nominatim',
          details: addr
        });
      }

      return res.status(500).json({ error: 'Failed to resolve address from coordinates.' });
    } catch (err: any) {
      console.error('Reverse geocode error:', err);
      return res.status(500).json({ error: 'Failed to retrieve address from coordinates.' });
    }
  });

  // 3. Google Maps Address Search / Autocomplete (Search landmark or address)
  app.get('/api/geocode/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || !String(q).trim()) {
        return res.status(400).json({ error: 'Search query is required.' });
      }

      const googleSearchUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(String(q).trim())}&key=${GOOGLE_MAPS_KEY}&language=en`;
      const gRes = await fetch(googleSearchUrl);
      
      if (gRes.ok) {
        const data = (await gRes.json()) as any;
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const formattedResults = data.results.map((r: any) => {
            const comps = r.address_components || [];
            let postcode = null;
            let city = null;
            for (const c of comps) {
              if (c.types.includes('postal_code')) postcode = c.long_name;
              if (c.types.includes('locality')) city = c.long_name;
            }
            return {
              formatted_address: r.formatted_address,
              latitude: r.geometry?.location?.lat,
              longitude: r.geometry?.location?.lng,
              postcode,
              city
            };
          });

          return res.json({
            success: true,
            results: formattedResults
          });
        }
      }

      return res.json({ success: true, results: [] });
    } catch (err: any) {
      console.error('Address search error:', err);
      return res.status(500).json({ error: 'Failed to search address via Google Maps.' });
    }
  });

  // Get reports for user
  app.get('/api/reports', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required to fetch reports.' });
      }

      const reports = await getReportsByUser(userId);
      return res.json({ reports });
    } catch (err: any) {
      console.error('Fetch reports error:', err);
      return res.status(500).json({ error: 'Failed to fetch reports.' });
    }
  });

  // Create new report
  app.post('/api/reports', async (req, res) => {
    try {
      const { userId, clientName, phone, pincode, latitude, longitude, address, feedback } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }
      if (!clientName || !clientName.trim()) {
        return res.status(400).json({ error: 'Client Name is required.' });
      }
      if (!phone || !phone.trim()) {
        return res.status(400).json({ error: 'Phone number is required.' });
      }
      if (!pincode || !pincode.trim()) {
        return res.status(400).json({ error: 'Pincode is required.' });
      }
      if (!feedback || !feedback.trim()) {
        return res.status(400).json({ error: 'Client Feedback is required.' });
      }

      const newReport = await createReport({
        userId,
        clientName,
        phone,
        pincode,
        latitude: latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : null,
        longitude: longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : null,
        address: address ? String(address).trim() : null,
        feedback
      });

      return res.status(201).json({
        success: true,
        report: newReport
      });
    } catch (err: any) {
      console.error('Create report error:', err);
      return res.status(500).json({ error: 'Failed to save report.' });
    }
  });

  // Delete report
  app.delete('/api/reports/:id', async (req, res) => {
    try {
      const reportId = req.params.id;
      const userId = (req.headers['x-user-id'] as string) || (req.body.userId as string);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }

      const success = await deleteReport(reportId, userId);
      if (!success) {
        return res.status(404).json({ error: 'Report not found or already deleted.' });
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete report.' });
    }
  });

  // --- Vite Middleware for Development / Static serving for Production ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Client Reports Server running on http://localhost:${PORT}`);
  });
}

startServer();
