import React, { useState } from 'react';
import { ClientReport } from '../types';
import {
  MapPin,
  Phone,
  Hash,
  Calendar,
  ExternalLink,
  Search,
  FileText,
  Trash2,
  Building,
  Navigation,
  MessageSquareQuote
} from 'lucide-react';

interface ReportListProps {
  reports: ClientReport[];
  loading: boolean;
  onDeleteReport: (reportId: string) => void;
}

export const ReportList: React.FC<ReportListProps> = ({
  reports,
  loading,
  onDeleteReport
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter((r) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      r.clientName.toLowerCase().includes(term) ||
      r.phone.toLowerCase().includes(term) ||
      r.pincode.toLowerCase().includes(term) ||
      (r.address && r.address.toLowerCase().includes(term)) ||
      r.feedback.toLowerCase().includes(term)
    );
  });

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const openGoogleMaps = (lat: number | null, lng: number | null) => {
    if (lat === null || lng === null) return;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header with Search */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">Your Reports</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {reports.length}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Filtered by user
          </span>
        </div>

        {/* Mobile Search input */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by client, phone, pin or notes..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Main Content List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 mx-auto border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
            <p className="text-xs text-slate-400 font-medium">Syncing database reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-8 text-center px-4">
            <div className="w-10 h-10 mx-auto mb-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">
              {searchTerm ? 'No matching reports' : 'No reports recorded yet'}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchTerm
                ? 'Try searching with a different term or clear filter.'
                : 'Submit a new visit report using the form above.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredReports.map((report) => {
            const hasCoordinates = report.latitude !== null && report.longitude !== null;
            return (
              <div
                key={report._id || report.id}
                id={`report-card-${report._id || report.id}`}
                className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs transition-all flex flex-col justify-between space-y-2.5"
              >
                {/* Top: Client Name & Date & Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">
                        {report.clientName}
                      </h4>
                      <div className="flex items-center text-[10px] text-slate-400 gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteReport(report._id || report.id || '')}
                    title="Delete report"
                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Metadata badges: Phone & Pincode */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <a
                    href={`tel:${report.phone}`}
                    className="inline-flex items-center px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 rounded text-slate-700 hover:text-indigo-700 font-medium text-[11px] transition-colors"
                  >
                    <Phone className="w-2.5 h-2.5 mr-1 text-slate-400" />
                    <span>{report.phone}</span>
                  </a>
                  <div className="inline-flex items-center px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-[11px]">
                    <Hash className="w-2.5 h-2.5 mr-1 text-slate-400" />
                    <span>PIN {report.pincode}</span>
                  </div>
                </div>

                {/* Feedback note */}
                <div className="bg-slate-50 border border-slate-100 rounded-md p-2 text-xs text-slate-700">
                  <div className="flex items-start gap-1.5">
                    <MessageSquareQuote className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="leading-relaxed whitespace-pre-wrap text-[11px]">{report.feedback}</p>
                  </div>
                </div>

                {/* Actual Physical Address if saved */}
                {report.address && (
                  <div className="p-2 bg-indigo-50/50 border border-indigo-100/80 rounded-md flex items-start gap-1.5 text-[11px] text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <span className="font-semibold text-indigo-900 block text-[10px] uppercase tracking-wide">Actual Address:</span>
                      <span className="text-slate-800">{report.address}</span>
                    </div>
                  </div>
                )}

                {/* Bottom: Location GPS & Maps Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {hasCoordinates ? (
                    <div className="text-[10px] text-slate-600 font-mono flex items-center gap-1 truncate">
                      <Navigation className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="truncate">
                        {report.latitude?.toFixed(5)}, {report.longitude?.toFixed(5)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic">No GPS saved</div>
                  )}

                  <button
                    id={`map-btn-${report._id || report.id}`}
                    onClick={() => openGoogleMaps(report.latitude, report.longitude)}
                    disabled={!hasCoordinates}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      hasCoordinates
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 active:bg-indigo-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer status indicator */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-4 text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          <span>Synced with Database</span>
        </span>
        <span className="text-slate-400 font-semibold">
          {filteredReports.length} {filteredReports.length === 1 ? 'record' : 'records'}
        </span>
      </div>
    </div>
  );
};

