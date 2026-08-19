"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

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
      if (userData.user.role !== 'admin') {
        router.push('/dashboard');
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

  const openMap = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-indigo-600 font-semibold">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans pb-10">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Image src="/5.png" alt="Logo" width={150} height={50} priority className="h-10 w-auto object-contain drop-shadow-sm" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Admin Control Panel</h1>
            <p className="text-xs text-gray-500">Monitoring All Agent Activities</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="text-sm font-semibold text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-lg transition"
        >
          Logout
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Reports</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{reports.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">With GPS</p>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{reports.filter(r => r.latitude).length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Unique Agents</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {new Set(reports.map(r => r.userId?._id || r.userId)).size}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-800">Recent Submissions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="p-4 border-b">Agent</th>
                  <th className="p-4 border-b">Client / Phone</th>
                  <th className="p-4 border-b">Location</th>
                  <th className="p-4 border-b">Feedback</th>
                  <th className="p-4 border-b text-right">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {reports.map(report => (
                  <tr key={report._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="p-4 font-semibold text-gray-800">
                      {report.userId?.name || 'Unknown'}
                      <div className="text-xs text-gray-400 font-normal">{report.userId?.email || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">{report.clientName}</div>
                      <div className="text-xs text-gray-500">{report.phone}</div>
                    </td>
                    <td className="p-4">
                      {report.latitude ? (
                        <div>
                          <button onClick={() => openMap(report.latitude, report.longitude)} className="text-[#4f46e5] text-xs font-bold hover:underline flex items-center gap-1">
                            View Map
                          </button>
                          {report.address && <div className="text-[10px] text-gray-500 mt-1 max-w-[150px] truncate" title={report.address}>{report.address}</div>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No Location</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-600 max-w-xs truncate" title={report.feedback}>
                      {report.feedback}
                    </td>
                    <td className="p-4 text-right text-xs text-gray-500 whitespace-nowrap">
                      {new Date(report.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400">No reports found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
