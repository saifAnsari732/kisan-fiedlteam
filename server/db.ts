import mongoose, { Schema, Document } from 'mongoose';
import fs from 'fs';
import path from 'path';

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

// Guard model re-compilation in development
export const UserModel = (mongoose.models.User as mongoose.Model<IUserDoc>) || mongoose.model<IUserDoc>('User', UserSchema);
export const ClientReportModel = (mongoose.models.ClientReport as mongoose.Model<IClientReportDoc>) || mongoose.model<IClientReportDoc>('ClientReport', ClientReportSchema);

// --- Dual Engine Data Access Layer ---
// Handles both connected MongoDB via Mongoose and a local persistent JSON file fallback
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
    console.error('Error reading local db file:', err);
  }

  // Initial seed with demo accounts and reports
  const initial: LocalDB = {
    users: [
      {
        _id: 'usr_demo_1',
        name: 'Alex Johnson',
        email: 'alex@company.com',
        password: 'password123',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        _id: 'usr_demo_2',
        name: 'Sarah Miller',
        email: 'sarah@company.com',
        password: 'password123',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ],
    reports: [
      {
        _id: 'rep_1',
        userId: 'usr_demo_1',
        clientName: 'Apex Logistics Ltd',
        phone: '+1 (555) 234-8901',
        pincode: '94105',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '500 Howard St, Financial District, San Francisco, CA 94105, USA',
        feedback: 'Client confirmed renewal for Q3. Discussed expanded coverage for warehouse hub.',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        _id: 'rep_2',
        userId: 'usr_demo_1',
        clientName: 'Summit Retail Corp',
        phone: '+1 (555) 876-5432',
        pincode: '94016',
        latitude: 37.7083,
        longitude: -122.4644,
        address: '888 Geneva Ave, Daly City, CA 94016, USA',
        feedback: 'In-person store audit complete. Requesting upgraded barcode scanner terminals.',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        _id: 'rep_3',
        userId: 'usr_demo_2',
        clientName: 'Beacon Healthcare',
        phone: '+1 (555) 345-6789',
        pincode: '94110',
        latitude: 37.7599,
        longitude: -122.4148,
        address: '2500 Mission St, Mission District, San Francisco, CA 94110, USA',
        feedback: 'Met with facility supervisor. Feedback on delivery turnaround was very positive.',
        createdAt: new Date().toISOString()
      }
    ]
  };

  saveLocalDB(initial);
  return initial;
}

function saveLocalDB(data: LocalDB) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local db file:', err);
  }
}

let isMongoConnected = false;

export async function initDatabase(): Promise<{ mode: 'mongodb' | 'local'; uri?: string }> {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000
      });
      isMongoConnected = true;
      console.log('Successfully connected to MongoDB via Mongoose:', uri);
      return { mode: 'mongodb', uri };
    } catch (err) {
      console.warn('MongoDB connection attempt timed out or failed. Falling back to persistent local storage.', err);
      isMongoConnected = false;
    }
  }
  
  // Ensure local DB is initialized
  loadLocalDB();
  return { mode: 'local' };
}

export function isUsingMongo(): boolean {
  return isMongoConnected && mongoose.connection.readyState === 1;
}

// User operations
export async function findUserByEmailOrName(identifier: string) {
  const lower = identifier.toLowerCase().trim();
  if (isUsingMongo()) {
    return await UserModel.findOne({
      $or: [{ email: lower }, { name: new RegExp(`^${identifier.trim()}$`, 'i') }]
    }).lean();
  } else {
    const db = loadLocalDB();
    return db.users.find(u => u.email.toLowerCase() === lower || u.name.toLowerCase() === lower);
  }
}

export async function findUserById(id: string) {
  if (isUsingMongo()) {
    return await UserModel.findById(id).lean();
  } else {
    const db = loadLocalDB();
    return db.users.find(u => u._id === id);
  }
}

export async function createUser(data: { name: string; email: string; password: string }) {
  if (isUsingMongo()) {
    const user = new UserModel({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: data.password
    });
    const saved = await user.save();
    return saved.toObject();
  } else {
    const db = loadLocalDB();
    const newUser = {
      _id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: data.password,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveLocalDB(db);
    return newUser;
  }
}

// Report operations
export async function getReportsByUser(userId: string) {
  if (isUsingMongo()) {
    return await ClientReportModel.find({ userId }).sort({ createdAt: -1 }).lean();
  } else {
    const db = loadLocalDB();
    return db.reports
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function createReport(data: {
  userId: string;
  clientName: string;
  phone: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
  feedback: string;
}) {
  if (isUsingMongo()) {
    const report = new ClientReportModel({
      userId: data.userId,
      clientName: data.clientName.trim(),
      phone: data.phone.trim(),
      pincode: data.pincode.trim(),
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address ? data.address.trim() : null,
      feedback: data.feedback.trim()
    });
    const saved = await report.save();
    return saved.toObject();
  } else {
    const db = loadLocalDB();
    const newReport = {
      _id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: data.userId,
      clientName: data.clientName.trim(),
      phone: data.phone.trim(),
      pincode: data.pincode.trim(),
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address ? data.address.trim() : null,
      feedback: data.feedback.trim(),
      createdAt: new Date().toISOString()
    };
    db.reports.unshift(newReport);
    saveLocalDB(db);
    return newReport;
  }
}

export async function deleteReport(reportId: string, userId: string) {
  if (isUsingMongo()) {
    const res = await ClientReportModel.deleteOne({ _id: reportId, userId });
    return res.deletedCount > 0;
  } else {
    const db = loadLocalDB();
    const initialLen = db.reports.length;
    db.reports = db.reports.filter(r => !(r._id === reportId && r.userId === userId));
    saveLocalDB(db);
    return db.reports.length < initialLen;
  }
}
