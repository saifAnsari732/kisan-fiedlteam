import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientName: { type: String, required: true },
  phone: { type: String, required: true },
  pincode: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  address: { type: String },
  feedback: { type: String }
}, { timestamps: true });

export default mongoose.models.Report || mongoose.model('Report', ReportSchema, 'client_tracker_reports');
