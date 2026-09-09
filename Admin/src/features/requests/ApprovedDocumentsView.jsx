// Admin/src/features/requests/ApprovedDocumentsView.jsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import CertificatePreview from '../../components/CertificatePreview';
import {
  FileCheck2,
  Eye,
  Printer,
  PackageCheck,
  Package,
  Search,
  ArrowUpDown,
  Calendar,
  Clock,
  User,
  Mail,
  RotateCcw,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../core/security';
import { TableSkeleton } from '../../components/SkeletonLoader';

export default function ApprovedDocumentsView({
  requests = [],
  onUpdateRequestStatus,
  config,
  currentUser,
  loading = false,
}) {
  const [selectedReq, setSelectedReq] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [claimFilter, setClaimFilter] = useState('all'); // 'all' | 'unclaimed' | 'claimed'
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'status'

  // Filter only approved, issued, or completed requests
  const approvedRequests = requests.filter(
    (r) =>
      r.status === 'approved' ||
      r.status === 'issued' ||
      r.status === 'ready_for_pickup' ||
      r.status === 'completed'
  );

  // Helper to check if a document is claimed/issued
  const isClaimed = (req) => {
    return req.status === 'issued' || req.status === 'completed' || !!req.is_claimed;
  };

  // Counts
  const totalCount = approvedRequests.length;
  const claimedCount = approvedRequests.filter((r) => isClaimed(r)).length;
  const unclaimedCount = approvedRequests.filter((r) => !isClaimed(r)).length;

  // Toggle Claimed / Unclaimed status
  const handleToggleClaimStatus = (req) => {
    const currentlyClaimed = isClaimed(req);
    const newStatus = currentlyClaimed ? 'approved' : 'issued';
    const adminName = currentUser?.full_name || currentUser?.email || 'Barangay Administrator';

    const updated = {
      ...req,
      status: newStatus,
      is_claimed: !currentlyClaimed,
      issued_at: !currentlyClaimed ? new Date().toISOString() : null,
      claimed_at: !currentlyClaimed ? new Date().toISOString() : null,
      claimed_by_admin: adminName,
      updated_at: new Date().toISOString(),
    };

    onUpdateRequestStatus(updated);
    if (selectedReq?.id === req.id) {
      setSelectedReq(updated);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter & Search
  const filteredRequests = approvedRequests.filter((req) => {
    const claimed = isClaimed(req);
    const matchesFilter =
      claimFilter === 'all' ||
      (claimFilter === 'claimed' && claimed) ||
      (claimFilter === 'unclaimed' && !claimed);

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      req.tracking_number?.toLowerCase().includes(term) ||
      req.resident_name?.toLowerCase().includes(term) ||
      req.resident_email?.toLowerCase().includes(term) ||
      req.document_title?.toLowerCase().includes(term) ||
      req.purpose?.toLowerCase().includes(term);

    return matchesFilter && matchesSearch;
  });

  // Sorting
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === 'date_desc') {
      const dateA = new Date(a.approved_at || a.created_at || 0).getTime();
      const dateB = new Date(b.approved_at || b.created_at || 0).getTime();
      return dateB - dateA;
    }
    if (sortBy === 'date_asc') {
      const dateA = new Date(a.approved_at || a.created_at || 0).getTime();
      const dateB = new Date(b.approved_at || b.created_at || 0).getTime();
      return dateA - dateB;
    }
    if (sortBy === 'name_asc') {
      return (a.resident_name || '').localeCompare(b.resident_name || '');
    }
    if (sortBy === 'name_desc') {
      return (b.resident_name || '').localeCompare(a.resident_name || '');
    }
    if (sortBy === 'status') {
      const statusA = isClaimed(a) ? 1 : 0;
      const statusB = isClaimed(b) ? 1 : 0;
      return statusA - statusB; // Unclaimed first
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Approved */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Approved</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Approved clearance certificates</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* Claimed Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Claimed Documents</p>
            <h3 className="text-2xl font-black text-emerald-800 mt-1">{claimedCount}</h3>
            <p className="text-[11px] text-emerald-600 mt-0.5">Officially released to residents</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Unclaimed Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Unclaimed Documents</p>
            <h3 className="text-2xl font-black text-amber-800 mt-1">{unclaimedCount}</h3>
            <p className="text-[11px] text-amber-600 mt-0.5">Awaiting resident pickup</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter, Search, and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `All Approved (${totalCount})` },
            { id: 'unclaimed', label: `Unclaimed (${unclaimedCount})` },
            { id: 'claimed', label: `Claimed (${claimedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setClaimFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                claimFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking, resident, doc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-800"
            >
              <option value="date_desc">Approved Date (Newest)</option>
              <option value="date_asc">Approved Date (Oldest)</option>
              <option value="name_asc">Resident Name (A - Z)</option>
              <option value="name_desc">Resident Name (Z - A)</option>
              <option value="status">Claim Status (Unclaimed First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Approved Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Tracking Number</th>
                <th className="p-4">Resident Applicant</th>
                <th className="p-4">Document Issued</th>
                <th className="p-4">Pick-up Time Slot</th>
                <th className="p-4">Purpose</th>
                <th className="p-4">Date Approved</th>
                <th className="p-4">Claim Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <TableSkeleton rows={6} cols={8} isDarkMode={false} />
              ) : sortedRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">No approved documents found.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Documents will appear here once processed and approved.</p>
                  </td>
                </tr>
              ) : (
                sortedRequests.map((req) => {
                  const claimed = isClaimed(req);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Tracking Number */}
                      <td className="p-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {req.tracking_number}
                        </span>
                      </td>

                      {/* Resident Applicant */}
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{req.resident_name || 'Resident Applicant'}</p>
                        <p className="text-[11px] text-slate-400">{req.resident_email}</p>
                      </td>

                      {/* Document Issued */}
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{req.document_title}</p>
                        <p className="text-[11px] text-emerald-700 font-bold">
                          {req.fee > 0 ? formatCurrency(req.fee) : 'Free'}
                        </p>
                      </td>

                      {/* Pick-up Time Slot */}
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-bold">
                          {req.pickup_time_slot || '9:00 AM - 9:30 AM'}
                        </span>
                      </td>

                      {/* Purpose */}
                      <td className="p-4 text-slate-600 max-w-xs truncate" title={req.purpose}>
                        {req.purpose || 'Local Employment Application'}
                      </td>

                      {/* Date Approved */}
                      <td className="p-4 text-slate-500 font-medium">
                        {req.approved_at ? formatDate(req.approved_at) : req.updated_at ? formatDate(req.updated_at) : 'Sep 8, 2026'}
                      </td>

                      {/* Claim Status Badge */}
                      <td className="p-4">
                        {claimed ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            Claimed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
                            Unclaimed
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-4 text-right space-x-2">
                        {/* Toggle Claim / Unclaim Action */}
                        <button
                          onClick={() => handleToggleClaimStatus(req)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition-colors cursor-pointer ${
                            claimed
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                          title={claimed ? 'Mark as Unclaimed' : 'Mark as Claimed / Released'}
                        >
                          {claimed ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Mark Unclaimed</span>
                            </>
                          ) : (
                            <>
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Mark Claimed</span>
                            </>
                          )}
                        </button>

                        {/* Certificate Preview Action */}
                        <button
                          onClick={() => setSelectedReq(req)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition-colors shadow-xs cursor-pointer"
                          title="View Digital Certificate"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Preview & Print Modal */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={`Official Certificate Digital Copy — ${selectedReq?.tracking_number}`}
        maxWidth="max-w-3xl"
      >
        {selectedReq && (
          <div className="space-y-6">
            {/* Modal Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                  {selectedReq.tracking_number}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isClaimed(selectedReq)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  }`}
                >
                  {isClaimed(selectedReq) ? 'Claimed' : 'Unclaimed'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleToggleClaimStatus(selectedReq)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer ${
                    isClaimed(selectedReq)
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  {isClaimed(selectedReq) ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Set Unclaimed</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Set Claimed</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
              </div>
            </div>

            {/* Live Certificate Body */}
            <CertificatePreview request={selectedReq} config={config} />
          </div>
        )}
      </Modal>
    </div>
  );
}
