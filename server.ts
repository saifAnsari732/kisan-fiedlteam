import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
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
const DATA_FILE = path.join(os.tmpdir(), 'client_field_reports_db.json');

const INITIAL_DEMO_USERS = [
  {
    _id: 'usr_alex_default',
    name: 'Alex Miller',
    email: 'alex@company.com',
    password: 'password123',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'usr_sarah_default',
    name: 'Sarah Miller',
    email: 'sarah@company.com',
    password: 'password123',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_DEMO_REPORTS = [
  {
    _id: 'rep_demo_01',
    userId: 'usr_alex_default',
    clientName: 'Apex Logistics Ltd',
    phone: '9876543210',
    pincode: '110001',
    latitude: 28.6139,
    longitude: 77.2090,
    address: 'Connaught Place, Central Delhi, New Delhi, 110001',
    feedback: 'Product demo conducted successfully. Client requested quotation for 50 units.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

interface LocalDB {
  users: Array<{ _id: string; name: string; email: string; password: string; createdAt: string }>;
  reports: Array<{ _id: string; userId: string; clientName: string; phone: string; pincode: string; latitude: number | null; longitude: number | null; address?: string | null; feedback: string; createdAt: string }>;
}

let inMemoryStore: LocalDB = {
  users: [...INITIAL_DEMO_USERS],
  reports: [...INITIAL_DEMO_REPORTS]
};

function loadLocalDB(): LocalDB {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.users)) {
        for (const defaultUser of INITIAL_DEMO_USERS) {
          if (!parsed.users.some((u: any) => u.email.toLowerCase() === defaultUser.email.toLowerCase())) {
            parsed.users.push(defaultUser);
          }
        }
        inMemoryStore = parsed;
        return parsed;
      }
    }
  } catch (err) {
    // ignore
  }
  return inMemoryStore;
}

function saveLocalDB(db: LocalDB): void {
  try {
    inMemoryStore = db;
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    inMemoryStore = db;
  }
}

// Global cached Mongo connection for Vercel serverless functions
interface GlobalMongo {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastError: string | null;
}

let cached: GlobalMongo = (global as any).mongooseCache || { conn: null, promise: null, lastError: null };
(global as any).mongooseCache = cached;

async function getDbConnection(): Promise<typeof mongoose | null> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || !mongoUri.trim()) {
    cached.lastError = 'MONGODB_URI is not set';
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    };
    cached.promise = mongoose.connect(mongoUri.trim(), opts).then((m) => {
      console.log('MongoDB connected successfully');
      cached.lastError = null;
      // Background seed demo accounts in MongoDB
      (async () => {
        try {
          for (const demoUser of INITIAL_DEMO_USERS) {
            const exists = await UserModel.findOne({ email: demoUser.email });
            if (!exists) {
              await UserModel.create({
                name: demoUser.name,
                email: demoUser.email,
                password: demoUser.password
              });
            }
          }
        } catch (e) {
          // ignore
        }
      })();
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err: any) {
    console.warn('MongoDB connection warning:', err.message);
    cached.lastError = err.message || 'Connection failed';
    cached.promise = null;
    cached.conn = null;
    return null;
  }
}

export function createExpressApp() {
  const app = express();
  app.use(express.json());

  // Non-blocking initial warm-up
  getDbConnection().catch(() => {});

  const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCgmGEomqsMzK3Fcx5Q4eVj8yWLkBBrbbA';

  const router = express.Router();

  // Health route
  router.get('/health', async (req, res) => {
    const dbConn = await getDbConnection();
    const isMongo = !!(dbConn && mongoose.connection.readyState === 1);
    res.json({
      status: 'ok',
      mongodb: {
        connected: isMongo,
        readyState: mongoose.connection.readyState,
        uriConfigured: !!(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0),
        lastError: isMongo ? null : cached.lastError
      },
      fallbackStore: 'Active (Fast in-memory / local buffer)',
      timestamp: new Date().toISOString()
    });
  });

  // 1. Auth Login
  router.post('/auth/login', async (req, res) => {
    try {
      const { usernameOrEmail, password } = req.body || {};
      if (!usernameOrEmail || !password) {
        return res.status(400).json({ error: 'Username/Email and Password are required.' });
      }

      const normalized = String(usernameOrEmail).toLowerCase().trim();
      let user: any = null;

      const dbConn = await getDbConnection();
      if (dbConn && mongoose.connection.readyState === 1) {
        try {
          user = await UserModel.findOne({
            $or: [{ email: normalized }, { name: String(usernameOrEmail).trim() }]
          });
        } catch (mErr) {
          console.warn('Mongoose query failed, using fallback:', mErr);
        }
      }

      if (!user) {
        const db = loadLocalDB();
        user = db.users.find(
          (u) => u.email.toLowerCase() === normalized || u.name.toLowerCase() === normalized
        );
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials. User not found. Please click "Create one" to register.' });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid password. Please verify your credentials.' });
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
      return res.status(500).json({ error: err.message || 'Server error occurred during login.' });
    }
  });

  // 2. Auth Register
  router.post('/auth/register', async (req, res) => {
    try {
      const { name, email, password } = req.body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const trimmedName = String(name).trim();

      const dbConn = await getDbConnection();
      if (dbConn && mongoose.connection.readyState === 1) {
        try {
          const existing = await UserModel.findOne({ email: normalizedEmail });
          if (existing) {
            return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
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
        } catch (mongoErr: any) {
          console.warn('MongoDB insert failed, saving to fallback:', mongoErr);
        }
      }

      // Fallback local memory store
      const db = loadLocalDB();
      const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
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
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create user account.' });
    }
  });

  // 3. User profile
  router.get('/auth/me', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized. No user ID provided.' });
      }

      let user: any = null;
      const dbConn = await getDbConnection();
      if (dbConn && mongoose.connection.readyState === 1) {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          user = await UserModel.findById(userId);
        }
      }

      if (!user) {
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
  router.post('/geolocation/google', async (req, res) => {
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
  router.get('/geocode/reverse', async (req, res) => {
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
        const postcode = addr.postcode || '';
        const city = addr.city || addr.town || addr.village || '';

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
  router.get('/geocode/search', async (req, res) => {
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
  router.get('/reports', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required to fetch reports.' });
      }

      let reports: any[] = [];
      const dbConn = await getDbConnection();
      if (dbConn && mongoose.connection.readyState === 1) {
        try {
          reports = await ClientReportModel.find({ userId }).sort({ createdAt: -1 }).lean();
        } catch (e) {
          console.warn('Mongo fetch reports failed, using memory store:', e);
        }
      }

      if (!reports || reports.length === 0) {
        const db = loadLocalDB();
        reports = db.reports
          .filter((r) => r.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      return res.json({ reports });
    } catch (err: any) {
      console.error('Fetch reports error:', err);
      return res.status(500).json({ error: 'Failed to retrieve reports.' });
    }
  });

  // 8. Create report
  router.post('/reports', async (req, res) => {
    try {
      const { userId, clientName, phone, pincode, latitude, longitude, address, feedback } = req.body || {};
      const headerUserId = req.headers['x-user-id'] as string;
      const targetUserId = userId || headerUserId;

      if (!targetUserId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }
      if (!clientName || !phone || !pincode || !feedback) {
        return res.status(400).json({ error: 'Required report fields are missing.' });
      }

      let savedReport: any = null;
      const dbConn = await getDbConnection();
      if (dbConn && mongoose.connection.readyState === 1) {
        try {
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
        } catch (e) {
          console.warn('Mongo save report failed, using fallback:', e);
        }
      }

      if (!savedReport) {
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
  router.delete('/reports/:id', async (req, res) => {
    try {
      const reportId = req.params.id;
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }

      const dbConn = await getDbConnection();
      if (dbConn && mongoose.connection.readyState === 1) {
        try {
          const deleted = await ClientReportModel.findOneAndDelete({ _id: reportId, userId });
          if (deleted) return res.json({ success: true, message: 'Report deleted.' });
        } catch (e) {
          // ignore
        }
      }

      const db = loadLocalDB();
      const idx = db.reports.findIndex((r) => r._id === reportId && r.userId === userId);
      if (idx !== -1) {
        db.reports.splice(idx, 1);
        saveLocalDB(db);
        return res.json({ success: true, message: 'Report deleted.' });
      }

      return res.json({ success: true, message: 'Report deleted.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete report.' });
    }
  });

  // Mount both under /api and root /
  app.use('/api', router);
  app.use('/', router);

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

if (process.env.VERCEL !== '1') {
  startServer();
}
