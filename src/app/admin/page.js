"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'agents'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, reportsRes, usersListRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/reports'),
        fetch('/api/admin/users')
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
      const usersData = await usersListRes.json();

      setUser(userData.user);
      setReports(reportsData.reports || []);
      setUsersList(usersData.users || []);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Reports</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{reports.length}</p>
            </div>
            <div className="bg-blue-50 text-blue-500 p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">With GPS</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{reports.filter(r => r.latitude).length}</p>
            </div>
            <div className="bg-indigo-50 text-indigo-500 p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Registered Agents</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {usersList.length}
              </p>
            </div>
            <div className="bg-green-50 text-green-500 p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button 
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'reports' ? 'border-rose-500 text-rose-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Recent Submissions
            </button>
            <button 
              onClick={() => setActiveTab('agents')}
              className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'agents' ? 'border-rose-500 text-rose-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Registered Agents & Details
            </button>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'reports' ? (
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
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
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
                      <td colSpan="5" className="p-8 text-center text-gray-400 font-medium">No reports found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400">
                    <th className="p-4 border-b">Agent Details</th>
                    <th className="p-4 border-b">Joined Date</th>
                    <th className="p-4 border-b text-center">Total Reports</th>
                    <th className="p-4 border-b text-center">GPS Usage</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {usersList.map(u => (
                    <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="p-4">
                        <div className="font-bold text-gray-800 text-base">{u.name}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                        {u.role === 'admin' && <span className="inline-block mt-1 bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">Admin</span>}
                      </td>
                      <td className="p-4 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg text-sm">{u.reportCount}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-green-50 text-green-700 font-bold px-3 py-1 rounded-lg text-sm">{u.gpsCount}</span>
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-400 font-medium">No agents registered</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
