import React, { useState } from 'react';
import { User, ClientReport } from '../types';
import {
  MapPin,
  Send,
  UserCheck,
  Phone,
  Hash,
  MessageSquare,
  Compass,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink
} from 'lucide-react';

interface ReportFormProps {
  user: User;
  onReportCreated: (newReport: ClientReport) => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({ user, onReportCreated }) => {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [feedback, setFeedback] = useState('');
  
  // Geolocation state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get Current Location handler
  const handleGetCurrentLocation = () => {
    setLocError(null);
    setLocLoading(true);

    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your mobile browser.');
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const acc = Math.round(position.coords.accuracy);

        setLatitude(lat);
        setLongitude(lng);
        setAccuracy(acc);
        setLocLoading(false);
      },
      (error) => {
        let msg = 'Unable to retrieve GPS coordinates.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'GPS permission denied. Please allow location access in your phone settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS position unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS request timed out.';
        }
        setLocError(msg);
        setLocLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!clientName.trim()) {
      setFormError('Please enter the client name.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter client phone number.');
      return;
    }
    if (!pincode.trim()) {
      setFormError('Please enter postal pincode.');
      return;
    }
    if (!feedback.trim()) {
      setFormError('Please provide client feedback notes.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user._id || user.id || ''
        },
        body: JSON.stringify({
          userId: user._id || user.id,
          clientName: clientName.trim(),
          phone: phone.trim(),
          pincode: pincode.trim(),
          latitude: latitude,
          longitude: longitude,
          feedback: feedback.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit client report.');
      }

      setSuccessMessage(`Report for "${clientName.trim()}" saved.`);
      onReportCreated(data.report);

      // Reset form fields
      setClientName('');
      setPhone('');
      setPincode('');
      setFeedback('');
      setLatitude(null);
      setLongitude(null);
      setAccuracy(null);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">New Client Report</h2>
          <p className="text-[11px] text-slate-400">Record field visit feedback & GPS coordinates</p>
        </div>
        <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center">
          <Send className="w-3.5 h-3.5" />
        </div>
      </div>

      {formError && (
        <div className="mb-3.5 p-2.5 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-3.5 p-2.5 bg-green-50 border border-green-200 rounded-md flex items-start gap-2 text-xs text-green-700">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Client Name */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="client-name">
            Client Name <span className="text-indigo-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <input
              id="client-name"
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Apex Enterprises"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-white transition-all"
            />
          </div>
        </div>

        {/* 2-column: Phone & Pincode */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="client-phone">
              Phone <span className="text-indigo-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <input
                id="client-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0192"
                className="w-full pl-8 pr-2.5 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="client-pincode">
              Pincode <span className="text-indigo-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-3.5 h-3.5" />
              </div>
              <input
                id="client-pincode"
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="94105"
                className="w-full pl-8 pr-2.5 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Current Location (GPS) button & status */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Current Location
          </label>
          <button
            id="get-location-btn"
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={locLoading}
            className={`w-full min-h-[42px] px-3 py-2 border-2 border-dashed rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              latitude !== null
                ? 'bg-green-50/70 border-green-300 text-green-800 hover:bg-green-100/60'
                : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 active:bg-indigo-50/60'
            }`}
          >
            {locLoading ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Acquiring GPS Position...</span>
              </>
            ) : latitude !== null ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span>GPS Tagged ({latitude}, {longitude})</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                <span>Get Current Location</span>
              </>
            )}
          </button>

          {/* Location details chip if acquired */}
          {latitude !== null && longitude !== null && (
            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700 font-mono">
                <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span>{latitude}, {longitude}</span>
                {accuracy && <span className="text-slate-400 font-sans">(±{accuracy}m)</span>}
              </div>
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
              >
                <span>Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {locError && (
            <p className="mt-1.5 text-[11px] text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
              <span>{locError}</span>
            </p>
          )}
        </div>

        {/* Client Feedback / Response */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="client-feedback">
            Feedback / Response <span className="text-indigo-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute top-2.5 left-2.5 flex items-start pointer-events-none text-slate-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <textarea
              id="client-feedback"
              rows={3}
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter meeting notes, product interest, client feedback..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-white transition-all resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          id="submit-report-btn"
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-2.5 px-4 rounded-md font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Report...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Client Report</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

