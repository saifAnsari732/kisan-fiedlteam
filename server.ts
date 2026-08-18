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
      const { userId, clientName, phone, pincode, latitude, longitude, feedback } = req.body;

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
