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
  ExternalLink,
  Navigation,
  Sparkles,
  Search,
  Edit3
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
  const [address, setAddress] = useState<string | null>(null);
  const [geoSource, setGeoSource] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Landmark search mode state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reverse geocoding via Google Maps API
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    setAddressLoading(true);
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          setAddress(data.address);
          setGeoSource(data.source || 'Google Maps API');
          // If pincode is empty, auto-populate from Google reverse geocode
          if (data.postcode && !pincode) {
            setPincode(data.postcode);
          }
        }
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  // 1. Get Location using Mobile GPS + Google Reverse Geocoding
  const handleGetCurrentLocation = () => {
    setLocError(null);
    setLocLoading(true);

    if (!navigator.geolocation) {
      // Fallback to Google Geolocation API directly
      handleGoogleGeolocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const acc = Math.round(position.coords.accuracy);

        setLatitude(lat);
        setLongitude(lng);
        setAccuracy(acc);
        setLocLoading(false);

        // Fetch high-accuracy address from Google Maps Geocoding
        await fetchAddressFromCoords(lat, lng);
      },
      async () => {
        // Fallback to Google Geolocation API
        await handleGoogleGeolocation();
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  // 2. Google Geolocation API handler
  const handleGoogleGeolocation = async () => {
    setLocLoading(true);
    setLocError(null);
    try {
      const res = await fetch('/api/geolocation/google', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setLatitude(Number(data.latitude.toFixed(6)));
        setLongitude(Number(data.longitude.toFixed(6)));
        setAccuracy(data.accuracy || 50);
        if (data.address) setAddress(data.address);
        if (data.postcode && !pincode) setPincode(data.postcode);
        setGeoSource(data.source || 'Google Geolocation');
      } else {
        setLocError('Unable to detect location. You can search or type address below.');
      }
    } catch {
      setLocError('Location detection error. Please allow browser location or search address.');
    } finally {
      setLocLoading(false);
    }
  };

  // 3. Search Landmark / Address via Google Maps
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        setLocError('No location matches found. Try another landmark or area name.');
      }
    } catch {
      setLocError('Error searching location.');
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (item: any) => {
    if (item.latitude && item.longitude) {
      setLatitude(Number(item.latitude.toFixed(6)));
      setLongitude(Number(item.longitude.toFixed(6)));
      setAccuracy(25);
    }
    setAddress(item.formatted_address);
    if (item.postcode) setPincode(item.postcode);
    setGeoSource('Google Maps Search');
    setShowSearch(false);
    setSearchResults([]);
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
          address: address ? address.trim() : null,
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
      setAddress(null);
      setGeoSource(null);
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
          <p className="text-[11px] text-slate-400">Record field visit feedback & Google GPS location</p>
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
                placeholder="+91 9876543210"
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
                placeholder="226012"
                className="w-full pl-8 pr-2.5 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Current Location (Google Maps GPS & Address) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Google Maps Location & Address
            </label>
            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3 h-3" />
              <span>{showSearch ? 'Hide Search' : 'Search Landmark'}</span>
            </button>
          </div>

          {/* Landmark Search Bar when toggled */}
          {showSearch && (
            <div className="mb-2 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type shop, building, or area name..."
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={searching}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  {searching ? <RotateCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  <span>Search</span>
                </button>
              </div>

              {/* Search Results dropdown */}
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 bg-white p-1 rounded border border-slate-200 shadow-sm">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSearchResult(item)}
                      className="w-full text-left p-1.5 hover:bg-indigo-50 rounded text-[11px] text-slate-700 flex items-start gap-1.5 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">{item.formatted_address}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Primary GPS button */}
          <button
            id="get-location-btn"
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={locLoading}
            className={`w-full min-h-[44px] px-3 py-2 border-2 border-dashed rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              latitude !== null
                ? 'bg-green-50/80 border-green-400 text-green-800 hover:bg-green-100/70'
                : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 active:bg-indigo-50/70'
            }`}
          >
            {locLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Fetching Real Location via Google Maps...</span>
              </>
            ) : latitude !== null ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Google GPS Tagged ({latitude}, {longitude})</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4 text-indigo-600" />
                <span>Get Current Location (Google Maps)</span>
              </>
            )}
          </button>

          {/* Actual Address Box when Location Captured */}
          {latitude !== null && longitude !== null && (
            <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
              {/* Header with coordinates and Google Maps link */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>{latitude}, {longitude}</span>
                  {accuracy && <span className="text-slate-400 font-sans text-[10px]">(±{accuracy}m)</span>}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Google Maps</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Actual Human-Readable Street / Area Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Actual Google Address:
                  </span>
                  {addressLoading ? (
                    <span className="text-[10px] text-indigo-600 flex items-center gap-1">
                      <RotateCw className="w-2.5 h-2.5 animate-spin" /> Verifying street address...
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {geoSource || 'Google Maps Verified'}
                    </span>
                  )}
                </div>

                {/* Editable address textarea so agent can fine-tune building/shop number */}
                <div className="relative">
                  <textarea
                    value={address || ''}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="Enter or verify actual physical address..."
                    className="w-full p-2 bg-white rounded border border-slate-200 text-slate-800 text-xs font-medium leading-relaxed shadow-2xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                  <div className="absolute right-2 bottom-2 text-slate-400 pointer-events-none">
                    <Edit3 className="w-3 h-3" />
                  </div>
                </div>
              </div>
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



