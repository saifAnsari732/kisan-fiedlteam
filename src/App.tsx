import React, { useState, useEffect, useCallback } from 'react';
import { User, ClientReport } from './types';
import { Navbar } from './components/Navbar';
import { LoginForm } from './components/LoginForm';
import { ReportForm } from './components/ReportForm';
import { ReportList } from './components/ReportList';
import { FileText, MapPin, PlusCircle, CheckCircle2, ListFilter, Sparkles } from 'lucide-react';

const STORAGE_USER_KEY = 'field_portal_current_user';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [reports, setReports] = useState<ClientReport[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Fetch reports for current user
  const fetchUserReports = useCallback(async (userId: string) => {
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/reports?userId=${encodeURIComponent(userId)}`, {
        headers: {
          'x-user-id': userId
        }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.reports)) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Failed to fetch user reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // Sync reports whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      const id = currentUser._id || currentUser.id;
      if (id) {
        fetchUserReports(id);
      }
    } else {
      setReports([]);
    }
  }, [currentUser, fetchUserReports]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    } catch (err) {
      console.error('Failed to save session to local storage', err);
    }
    showToast(`Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setReports([]);
    try {
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch (err) {
      console.error('Failed to clear session', err);
    }
    showToast('You have been logged out.');
  };

  const handleReportCreated = (newReport: ClientReport) => {
    setReports((prev) => [newReport, ...prev]);
    showToast('Report submitted and saved.');
    // Smoothly auto switch to list
    setActiveTab('list');
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!currentUser) return;
    const userId = currentUser._id || currentUser.id || '';

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        setReports((prev) => prev.filter((r) => (r._id || r.id) !== reportId));
        showToast('Report deleted.');
      }
    } catch (err) {
      console.error('Failed to delete report', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Compute summary stats
  const totalReportsCount = reports.length;
  const reportsWithGpsCount = reports.filter((r) => r.latitude !== null && r.longitude !== null).length;

  return (
    <div className="min-h-screen bg-slate-200/90 flex flex-col items-center justify-center sm:p-4 selection:bg-indigo-600 selection:text-white font-sans">
      {/* Phone Frame Container */}
      <div className="w-full max-w-md min-h-screen sm:min-h-0 sm:h-[860px] sm:max-h-[92vh] bg-[#F1F5F9] sm:rounded-3xl sm:shadow-2xl sm:border sm:border-slate-300 flex flex-col overflow-hidden relative">
        
        {/* Phone Top Header */}
        <Navbar user={currentUser} onLogout={handleLogout} />

        {/* Floating Toast inside Phone View */}
        {toastMessage && (
          <div className="absolute top-16 left-4 right-4 z-50 bg-slate-900 text-white px-3.5 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-medium animate-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {/* Phone Content Scrollable Body */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20 sm:pb-20">
          {!currentUser ? (
            /* Login View */
            <div className="py-2 space-y-4">
              <div className="text-center px-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wide mb-2">
                  <Sparkles className="w-3 h-3" /> Field Rep Portal
                </span>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  Client Field Visit System
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Record client visit notes with real-time GPS location capture.
                </p>
              </div>

              <LoginForm onLoginSuccess={handleLoginSuccess} />
            </div>
          ) : (
            /* Authenticated Phone Dashboard */
            <div className="space-y-3.5">
              {/* Agent Quick Stats Strip */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Active Agent
                  </span>
                  <span className="text-sm font-bold text-slate-800 leading-tight">
                    {currentUser.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-center">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                      <FileText className="w-2.5 h-2.5 text-indigo-600" />
                      <span>Reports</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{totalReportsCount}</span>
                  </div>

                  <div className="px-2.5 py-1 bg-green-50/60 border border-green-200 rounded-md text-center">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-700 uppercase">
                      <MapPin className="w-2.5 h-2.5 text-green-600" />
                      <span>GPS</span>
                    </div>
                    <span className="text-xs font-bold text-green-700">{reportsWithGpsCount}</span>
                  </div>
                </div>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="bg-slate-200/80 p-1 rounded-lg flex items-center border border-slate-300/80">
                <button
                  id="tab-new-report-btn"
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'create'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Visit Report</span>
                </button>

                <button
                  id="tab-view-reports-btn"
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'list'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Reports ({totalReportsCount})</span>
                </button>
              </div>

              {/* Active Tab View */}
              {activeTab === 'create' ? (
                <ReportForm user={currentUser} onReportCreated={handleReportCreated} />
              ) : (
                <ReportList
                  reports={reports}
                  loading={loadingReports}
                  onDeleteReport={handleDeleteReport}
                />
              )}
            </div>
          )}
        </main>

        {/* Mobile Sticky Bottom App Bar when Logged In */}
        {currentUser && (
          <nav className="absolute bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-around z-20 shadow-lg">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors cursor-pointer ${
                activeTab === 'create' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">New Visit</span>
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors cursor-pointer ${
                activeTab === 'list' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <FileText className="w-4 h-4" />
                {totalReportsCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                    {totalReportsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
            </button>
          </nav>
        )}

      </div>
    </div>
  );
}

