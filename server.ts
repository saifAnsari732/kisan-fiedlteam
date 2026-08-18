import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import mongoose, { Schema, Document } from 'mongoose';

// --- Mongoose Interfaces & Schemas ---
export interface IUserDoc extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface IClientReportDoc extends Document {
  userId: string;
  clientName: string;
  phone: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  feedback: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDoc>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ClientReportSchema = new Schema<IClientReportDoc>({
  userId: { type: String, required: true, index: true },
  clientName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  address: { type: String, default: null, trim: true },
  feedback: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

export const UserModel = (mongoose.models.User as mongoose.Model<IUserDoc>) || mongoose.model<IUserDoc>('User', UserSchema);
export const ClientReportModel = (mongoose.models.ClientReport as mongoose.Model<IClientReportDoc>) || mongoose.model<IClientReportDoc>('ClientReport', ClientReportSchema);

// --- Dual Engine Data Storage Engine ---
const DATA_FILE = path.join(process.cwd(), '.local_db.json');

interface LocalDB {
  users: Array<{ _id: string; name: string; email: string; password: string; createdAt: string }>;
  reports: Array<{ _id: string; userId: string; clientName: string; phone: string; pincode: string; latitude: number | null; longitude: number | null; address?: string | null; feedback: string; createdAt: string }>;
}

function loadLocalDB(): LocalDB {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading local JSON DB:', err);
  }
  return { users: [], reports: [] };
}

function saveLocalDB(db: LocalDB): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local JSON DB:', err);
  }
}

let isMongoConnected = false;

async function initDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoUri.trim().length > 0) {
    try {
      console.log('Connecting to MongoDB database...');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      isMongoConnected = true;
      console.log('MongoDB connected successfully.');
    } catch (err) {
      console.warn('MongoDB connection failed. Using fallback persistent datastore.');
      isMongoConnected = false;
    }
  } else {
    isMongoConnected = false;
  }
}

function isUsingMongo(): boolean {
  return isMongoConnected && mongoose.connection.readyState === 1;
}

export function createExpressApp() {
  const app = express();
  app.use(express.json());

  initDatabase().catch((err) => console.error('DB init warning:', err));

  const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCgmGEomqsMzK3Fcx5Q4eVj8yWLkBBrbbA';

  // --- API Routes ---

  // Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      db: isUsingMongo() ? 'MongoDB (Mongoose)' : 'Local Datastore',
      timestamp: new Date().toISOString()
    });
  });

  // 1. Auth Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { usernameOrEmail, password } = req.body;
      if (!usernameOrEmail || !password) {
        return res.status(400).json({ error: 'Username/Email and Password are required.' });
      }

      const normalized = String(usernameOrEmail).toLowerCase().trim();
      let user: any = null;

      if (isUsingMongo()) {
        user = await UserModel.findOne({
          $or: [{ email: normalized }, { name: String(usernameOrEmail).trim() }]
        });
      } else {
        const db = loadLocalDB();
        user = db.users.find(
          (u) => u.email.toLowerCase() === normalized || u.name.toLowerCase() === normalized
        );
      }

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
      return res.status(500).json({ error: 'Server error occurred during login.' });
    }
  });

  // 2. Auth Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const trimmedName = String(name).trim();

      if (isUsingMongo()) {
        const existing = await UserModel.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(400).json({ error: 'A user with this email already exists.' });
        }
        const newUser = await UserModel.create({
          name: trimmedName,
          email: normalizedEmail,
          password
        });
        return res.status(201).json({
          success: true,
          user: {
            id: newUser._id.toString(),
            _id: newUser._id.toString(),
            name: newUser.name,
            email: newUser.email
          }
        });
      } else {
        const db = loadLocalDB();
        const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (existing) {
          return res.status(400).json({ error: 'A user with this email already exists.' });
        }
        const newUser = {
          _id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          name: trimmedName,
          email: normalizedEmail,
          password,
          createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        saveLocalDB(db);
        return res.status(201).json({
          success: true,
          user: {
            id: newUser._id,
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email
          }
        });
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Failed to create user account.' });
    }
  });

  // 3. User profile
  app.get('/api/auth/me', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized. No user ID provided.' });
      }

      let user: any = null;
      if (isUsingMongo()) {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          user = await UserModel.findById(userId);
        }
      } else {
        const db = loadLocalDB();
        user = db.users.find((u) => u._id === userId);
      }

      if (!user) {
        return res.status(404).json({ error: 'User profile not found.' });
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

  // 4. Google Geolocation API
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

  // 5. Reverse Geocoding with Google Maps
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

            for (const c of comps) {
              if (c.types.includes('postal_code')) postcode = c.long_name;
              if (c.types.includes('locality')) city = c.long_name;
            }

            return res.json({
              success: true,
              address: bestResult.formatted_address,
              postcode: postcode || null,
              city: city || null,
              source: 'Google Maps Geocoding API'
            });
          }
        }
      } catch (gErr) {
        console.warn('Google Maps geocoding call failed, falling back:', gErr);
      }

      // Fallback: OpenStreetMap Nominatim
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(numLat)}&lon=${encodeURIComponent(numLng)}&addressdetails=1`;
      const geoRes = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'FieldOpsClientReportApp/1.0',
          'Accept-Language': 'en,hi'
        }
      });

      if (geoRes.ok) {
        const geoData = (await geoRes.json()) as any;
        const addr = geoData.address || {};
        const street = addr.road || addr.suburb || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.village || '';
        const postcode = addr.postcode || '';

        return res.json({
          success: true,
          address: geoData.display_name || `${numLat}, ${numLng}`,
          postcode: postcode || null,
          city: city || null,
          source: 'OpenStreetMap Nominatim'
        });
      }

      return res.status(500).json({ error: 'Failed to resolve address.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Reverse geocode error.' });
    }
  });

  // 6. Google Maps Address Search / Autocomplete
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
          const formattedResults = data.results.map((r: any) => ({
            formatted_address: r.formatted_address,
            latitude: r.geometry?.location?.lat,
            longitude: r.geometry?.location?.lng,
            postcode: r.address_components?.find((c: any) => c.types.includes('postal_code'))?.long_name || null
          }));

          return res.json({ success: true, results: formattedResults });
        }
      }

      return res.json({ success: true, results: [] });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to search address via Google Maps.' });
    }
  });

  // 7. Get reports for user
  app.get('/api/reports', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required to fetch reports.' });
      }

      let reports: any[] = [];
      if (isUsingMongo()) {
        reports = await ClientReportModel.find({ userId }).sort({ createdAt: -1 }).lean();
      } else {
        const db = loadLocalDB();
        reports = db.reports
          .filter((r) => r.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      return res.json({ reports });
    } catch (err: any) {
      console.error('Fetch reports error:', err);
      return res.status(500).json({ error: 'Failed to retrieve reports from database.' });
    }
  });

  // 8. Create report
  app.post('/api/reports', async (req, res) => {
    try {
      const { userId, clientName, phone, pincode, latitude, longitude, address, feedback } = req.body;
      const headerUserId = req.headers['x-user-id'] as string;
      const targetUserId = userId || headerUserId;

      if (!targetUserId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }
      if (!clientName || !phone || !pincode || !feedback) {
        return res.status(400).json({ error: 'Required report fields are missing.' });
      }

      let savedReport: any = null;
      if (isUsingMongo()) {
        savedReport = await ClientReportModel.create({
          userId: targetUserId,
          clientName: String(clientName).trim(),
          phone: String(phone).trim(),
          pincode: String(pincode).trim(),
          latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
          longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
          address: address ? String(address).trim() : null,
          feedback: String(feedback).trim()
        });
      } else {
        const db = loadLocalDB();
        const newRep = {
          _id: 'rep_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          userId: targetUserId,
          clientName: String(clientName).trim(),
          phone: String(phone).trim(),
          pincode: String(pincode).trim(),
          latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
          longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
          address: address ? String(address).trim() : null,
          feedback: String(feedback).trim(),
          createdAt: new Date().toISOString()
        };
        db.reports.push(newRep);
        saveLocalDB(db);
        savedReport = newRep;
      }

      return res.status(201).json({ success: true, report: savedReport });
    } catch (err: any) {
      console.error('Create report error:', err);
      return res.status(500).json({ error: 'Failed to save client report.' });
    }
  });

  // 9. Delete report
  app.delete('/api/reports/:id', async (req, res) => {
    try {
      const reportId = req.params.id;
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }

      if (isUsingMongo()) {
        const deleted = await ClientReportModel.findOneAndDelete({ _id: reportId, userId });
        if (!deleted) return res.status(404).json({ error: 'Report not found.' });
      } else {
        const db = loadLocalDB();
        const idx = db.reports.findIndex((r) => r._id === reportId && r.userId === userId);
        if (idx === -1) return res.status(404).json({ error: 'Report not found.' });
        db.reports.splice(idx, 1);
        saveLocalDB(db);
      }

      return res.json({ success: true, message: 'Report deleted.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete report.' });
    }
  });

  return app;
}

async function startServer() {
  const app = createExpressApp();
  const PORT = 3000;

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
