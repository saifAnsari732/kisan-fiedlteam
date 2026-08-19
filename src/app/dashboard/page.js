"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'

  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    pincode: '',
    feedback: '',
    latitude: '',
    longitude: '',
    address: ''
  });
  const [isLocating, setIsLocating] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, reportsRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/reports')
      ]);

      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const userData = await userRes.json();
      
      if (userData.user.role === 'admin') {
        router.push('/admin');
        return;
      }

      const reportsData = await reportsRes.json();

      setUser(userData.user);
      setReports(reportsData.reports || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let fetchedAddress = 'Location saved';
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            fetchedAddress = data.display_name;
          }
        } catch (err) {
          console.error("Failed to fetch address", err);
        }

        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: fetchedAddress
        }));
        setIsLocating(false);
      },
      (error) => {
        alert('Unable to retrieve your location. Make sure location permissions are granted.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setMessage({ text: 'Report submitted successfully!', type: 'success' });
        setFormData({ clientName: '', phone: '', pincode: '', feedback: '', latitude: '', longitude: '', address: '' });
        fetchData(); // refresh list
        setTimeout(() => setActiveTab('history'), 1000);
      } else {
        setMessage({ text: 'Failed to submit report.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setSubmitLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const openMap = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-indigo-600 font-semibold">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24 font-sans">
      <div className="max-w-md mx-auto relative pt-4 px-4 space-y-4">
        
        {/* Top Active Agent Card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-center border border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Agent</p>
            <h1 className="text-lg font-bold text-gray-800 capitalize">{user?.name || 'Agent'}</h1>
          </div>
          <div className="flex gap-2">
            <div className="border border-indigo-100 bg-indigo-50/30 rounded-lg px-3 py-1.5 text-center min-w-[70px]">
              <p className="text-[10px] font-bold text-indigo-500 uppercase flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                Reports
              </p>
              <p className="font-bold text-gray-800 text-sm mt-0.5">{reports.length}</p>
            </div>
            <div className="border border-green-100 bg-green-50/30 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
              <p className="text-[10px] font-bold text-green-500 uppercase flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                GPS
              </p>
              <p className="font-bold text-gray-800 text-sm mt-0.5">
                {reports.filter(r => r.latitude).length}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Tabs (Visible mostly on tablet/desktop but let's keep it responsive) */}
        <div className="bg-[#e2e8f0]/60 rounded-xl p-1 flex">
          <button 
            onClick={() => setActiveTab('new')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'new' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            New Visit Report
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
            Reports ({reports.length})
          </button>
        </div>

        {/* Main Content Area */}
        {activeTab === 'new' ? (
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-[17px] font-bold text-gray-800">New Client Report</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Record field visit feedback & Google GPS location</p>
              </div>
              <div className="bg-indigo-50 p-2 rounded-lg">
                <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
              </div>
            </div>

            <div className="border-t border-gray-100 my-4"></div>

            {message.text && (
              <div className={`p-3 rounded-lg mb-4 text-xs font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Client Name */}
              <div>
                <label className="block text-[10px] font-bold text-[#64748b] tracking-wider mb-1.5 uppercase">Client Name <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                  </div>
                  <input
                    type="text" required placeholder="e.g. Apex Enterprises"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm text-gray-700 transition placeholder:text-gray-300"
                    value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})}
                  />
                </div>
              </div>

              {/* Phone & Pincode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#64748b] tracking-wider mb-1.5 uppercase">Phone <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.18-7.076-7.076l1.293-.97c.362-.271.527-.733.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                    </div>
                    <input
                      type="tel" required placeholder="+91 9876543210"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm text-gray-700 transition placeholder:text-gray-300"
                      value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#64748b] tracking-wider mb-1.5 uppercase">Pincode <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" /></svg>
                    </div>
                    <input
                      type="text" required placeholder="226012"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm text-gray-700 transition placeholder:text-gray-300"
                      value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-[#64748b] tracking-wider uppercase">Google Maps Location & Address</label>
                  <button type="button" className="text-[10px] text-rose-600 flex items-center gap-1 font-semibold">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    Search Landmark
                  </button>
                </div>
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={isLocating}
                  className="w-full py-3 px-4 border-2 border-dashed border-[#c7d2fe] bg-white text-rose-600 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-50 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                  {isLocating ? 'Acquiring GPS...' : 'Get Current Location (Google Maps)'}
                </button>
                {formData.address && (
                  <p className="text-[11px] text-[#059669] mt-2 font-medium bg-[#ecfdf5] p-2 rounded-lg border border-[#a7f3d0]">
                    ✓ {formData.address}
                  </p>
                )}
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-[10px] font-bold text-[#64748b] tracking-wider mb-1.5 uppercase">Feedback / Response <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
                  </div>
                  <textarea
                    required rows="3" placeholder="Enter meeting notes, product interest, client feedback..."
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm text-gray-700 transition resize-none placeholder:text-gray-300"
                    value={formData.feedback} onChange={e => setFormData({...formData, feedback: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <button
                type="submit" disabled={submitLoading}
                className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-rose-200 flex justify-center items-center gap-2 disabled:opacity-70 mt-4"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                {submitLoading ? 'Submitting...' : 'Submit Client Report'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                <div className="mx-auto bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                </div>
                <p className="text-gray-500 font-medium text-sm">No reports submitted yet.</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report._id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                        {report.clientName}
                      </h3>
                      <p className="text-[11px] text-gray-400 ml-5">{new Date(report.createdAt).toLocaleString()}</p>
                    </div>
                    {report.latitude && report.longitude && (
                      <button
                        onClick={() => openMap(report.latitude, report.longitude)}
                        className="bg-[#eef2ff] text-rose-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                        Map
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3 ml-5">
                    <p className="flex items-center gap-1"><span className="font-semibold text-gray-400">Phone:</span> {report.phone}</p>
                    <p className="flex items-center gap-1"><span className="font-semibold text-gray-400">Pin:</span> {report.pincode}</p>
                  </div>
                  
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 text-sm text-gray-700 ml-5 relative">
                    <div className="absolute top-3 -left-3 border-t-8 border-t-transparent border-r-8 border-r-gray-50/80 border-b-8 border-b-transparent"></div>
                    {report.feedback}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center max-w-md mx-auto shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-50">
        <button 
          onClick={() => setActiveTab('new')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'new' ? 'text-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">New Visit</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition-colors relative ${activeTab === 'history' ? 'text-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            {reports.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#4f46e5] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                {reports.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Logout</span>
        </button>
      </div>
    </div>
  );
}
