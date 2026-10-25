import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './features/dashboard/DashboardView';
import ReceiveRequestView from './features/requests/ReceiveRequestView';
import ApprovedDocumentsView from './features/requests/ApprovedDocumentsView';
import DocumentsView from './features/documents/DocumentsView';
import NewsView from './features/news/NewsView';
import ReportsView from './features/reports/ReportsView';
import LogsView from './features/logs/LogsView';
import UserManagementView from './features/users/UserManagementView';
import AccountView from './features/account/AccountView';
import ArchiveView from './features/archive/ArchiveView';
import AdminLoginPage from './features/auth/AdminLoginPage';
import GlobalFooter from './components/GlobalFooter';
import { StorageService } from './core/storage';
import { supabase, isSupabaseConfigured } from './core/supabase';
import { GlobalPageSkeleton } from './components/SkeletonLoader';
import { ShieldAlert, Building2, X, LogOut } from 'lucide-react';
import './index.css';

const VALID_ADMIN_TABS = [
  'dashboard',
  'receive_request',
  'approved_documents',
  'doc_info',
  'news',
  'reports',
  'users',
  'logs',
  'archive',
  'account',
];

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('zapatera_admin_active_tab');
      if (saved && VALID_ADMIN_TABS.includes(saved)) {
        return saved;
      }
    } catch {}
    return 'dashboard';
  });

  useEffect(() => {
    try {
      if (activeTab && VALID_ADMIN_TABS.includes(activeTab)) {
        localStorage.setItem('zapatera_admin_active_tab', activeTab);
      }
    } catch {}
  }, [activeTab]);
  const [searchQuery, setSearchQuery] = useState('');
  // Mobile responsive drawer state (< 1024px)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tabTransitioning, setTabTransitioning] = useState(false);

  const [currentUser, setCurrentUser] = useState(StorageService.getCurrentUser());
  const [accountDeletedNotice, setAccountDeletedNotice] = useState(null);
  const [requests, setRequests] = useState(StorageService.getRequests());
  const [docTypes, setDocTypes] = useState(StorageService.getDocTypes());
  const [events, setEvents] = useState(StorageService.getEvents());
  const [logs, setLogs] = useState(StorageService.getLogs());
  const [config, setConfig] = useState(StorageService.getConfig());

  // Global Skeletal Loading State (Dashboard prioritized first)
  const [isDashboardReady, setIsDashboardReady] = useState(false);
  const [pageLoadingState, setPageLoadingState] = useState({
    dashboard: true,
    receive_request: true,
    approved_documents: true,
    doc_info: true,
    news: true,
    reports: true,
    users: true,
    logs: true,
    archive: true,
    account: false,
  });

  /**
   * Prioritized Refresh State:
   * Phase 1: Dashboard Core Data (requests, docTypes, events, config)
   *          Unblocks and reveals the Admin dashboard immediately.
   * Phase 2: Secondary Background Data (audit logs)
   *          Runs in background without holding up the dashboard or primary workspace.
   */
  const refreshState = async (options = {}) => {
    const { isInitial = false } = options;

    if (isInitial) {
      setIsDashboardReady(false);
      setPageLoadingState({
        dashboard: true,
        receive_request: true,
        approved_documents: true,
        doc_info: true,
        news: true,
        reports: true,
        users: true,
        logs: true,
        archive: true,
        account: false,
      });
    }

    // =========================================================================
    // PRIORITY 1: Admin Dashboard Core Data (Fast Track)
    // =========================================================================
    try {
      const [reqs, docs, evts, cfg] = await Promise.all([
        StorageService.getRequestsAsync(),
        StorageService.getDocTypesAsync(),
        StorageService.getEventsAsync(),
        StorageService.getConfigAsync(),
      ]);

      if (reqs) setRequests(reqs);
      if (docs) setDocTypes(docs);
      if (evts) setEvents(evts);
      if (cfg) setConfig(cfg);

      const user = StorageService.getCurrentUser();
      if (user && user.role !== 'admin') {
        StorageService.setCurrentUser(null);
        setCurrentUser(null);
      } else if (user) {
        setCurrentUser(user);
      }

      setIsDashboardReady(true);
      setPageLoadingState((prev) => ({
        ...prev,
        dashboard: false,
        receive_request: false,
        approved_documents: false,
        doc_info: false,
        news: false,
        users: false,
        account: false,
      }));
    } catch (err) {
      console.warn('Admin priority dashboard sync error:', err);
      setIsDashboardReady(true);
      setPageLoadingState((prev) => ({ ...prev, dashboard: false }));
    }

    // =========================================================================
    // PRIORITY 2: Secondary Background Data (Logs)
    // =========================================================================
    try {
      const logsData = await StorageService.getLogsAsync();
      if (logsData) setLogs(logsData);
    } catch (err) {
      console.warn('Admin background sync error:', err);
    } finally {
      setPageLoadingState((prev) => ({
        ...prev,
        reports: false,
        logs: false,
        archive: false,
      }));
    }
  };

  useEffect(() => {
    const initialUser = StorageService.getCurrentUser();
    if (initialUser && initialUser.role !== 'admin') {
      StorageService.setCurrentUser(null);
      setCurrentUser(null);
    }
    refreshState({ isInitial: true });

    const handleConfigUpdate = () => {
      StorageService.getConfigAsync().then((newCfg) => {
        if (newCfg) setConfig(newCfg);
      });
    };

    window.addEventListener('storage', handleConfigUpdate);
    window.addEventListener('zapatera_config_updated', handleConfigUpdate);

    // Live update when avatar/profile changes
    const handleUserUpdated = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      }
    };
    window.addEventListener('zapatera_user_updated', handleUserUpdated);

    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('zapatera_security_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'ACCOUNT_DELETED') {
          const deletedId = event.data?.userId;
          const deletedEmail = (event.data?.email || '').toLowerCase().trim();
          const user = StorageService.getCurrentUser();
          const myEmail = (user?.email || '').toLowerCase().trim();
          if (deletedId === user?.id || (deletedEmail && deletedEmail === myEmail)) {
            setAccountDeletedNotice('Notice: This account has been deleted by Barangay Zapatera administration. You have been logged out.');
            StorageService.setCurrentUser(null);
            setCurrentUser(null);
          }
        } else if (event.data?.type === 'DOCUMENT_REQUEST_DELETED') {
          const { requestId, trackingNumber } = event.data;
          setRequests((prev) => prev.filter((r) => r.id !== requestId && r.tracking_number !== trackingNumber));
          refreshState();
        } else if (event.data?.type === 'DOCUMENT_REQUEST_UPDATED') {
          refreshState();
        }
      };
    }

    const handleStorageDeleted = (e) => {
      if (e.key === 'zapatera_account_deleted_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const deletedEmail = (parsed.email || '').toLowerCase().trim();
          const user = StorageService.getCurrentUser();
          const myEmail = (user?.email || '').toLowerCase().trim();
          if (parsed.userId === user?.id || (deletedEmail && deletedEmail === myEmail)) {
            setAccountDeletedNotice('Notice: This account has been deleted by Barangay Zapatera administration. You have been logged out.');
            StorageService.setCurrentUser(null);
            setCurrentUser(null);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageDeleted);

    return () => {
      window.removeEventListener('storage', handleConfigUpdate);
      window.removeEventListener('zapatera_config_updated', handleConfigUpdate);
      window.removeEventListener('zapatera_user_updated', handleUserUpdated);
      window.removeEventListener('storage', handleStorageDeleted);
      if (bc) bc.close();
    };
  }, []);

  const [receiveRequestTarget, setReceiveRequestTarget] = useState(null);
  const [approvedDocsTarget, setApprovedDocsTarget] = useState(null);

  const handleQueueAction = (action, item) => {
    if (action === 'evaluate' || action === 'reject') {
      setReceiveRequestTarget(item);
      setActiveTab('receive_request');
    } else if (action === 'generate') {
      setApprovedDocsTarget(item);
      setActiveTab('approved_documents');
    }
  };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogoutRequest = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
    setIsMobileMenuOpen(false);
    setActiveTab('dashboard');
    try {
      localStorage.removeItem('zapatera_admin_active_tab');
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch {}
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleDeleteRequest = async (requestId, trackingNumber) => {
    await StorageService.deleteRequest(requestId, trackingNumber, currentUser);
    await refreshState();
  };

  const handleUpdateRequestStatus = async (updatedReqOrId, status, additionalData = {}) => {
    if (typeof updatedReqOrId === 'object' && updatedReqOrId !== null) {
      await StorageService.saveRequest(updatedReqOrId, currentUser);
    } else if (typeof StorageService.updateRequestStatus === 'function') {
      await StorageService.updateRequestStatus(updatedReqOrId, status, additionalData, currentUser);
    } else {
      const allReqs = StorageService.getRequests();
      const existing = allReqs.find((r) => (updatedReqOrId && r.id === updatedReqOrId) || (updatedReqOrId && r.tracking_number === updatedReqOrId)) || {};
      const payload = {
        ...existing,
        id: updatedReqOrId,
        status: status || existing.status,
        ...additionalData,
      };
      await StorageService.saveRequest(payload, currentUser);
    }
    await refreshState();
  };

  const handleSaveDocType = async (docTypePayload) => {
    await StorageService.saveDocType(docTypePayload, currentUser);
    await refreshState();
  };

  const handleDeleteDocType = async (docTypeId) => {
    await StorageService.deleteDocType(docTypeId, currentUser);
    await refreshState();
  };

  const handleSaveEvent = async (eventPayload) => {
    await StorageService.saveEvent(eventPayload, currentUser);
    await refreshState();
  };

  const handleDeleteEvent = async (eventId) => {
    await StorageService.deleteEvent(eventId, currentUser);
    await refreshState();
  };

  const tabTitles = {
    dashboard: 'Administrator Operations Dashboard',
    receive_request: 'Incoming Document Application Queue',
    approved_documents: 'Approved Documents & Certification Queue',
    doc_info: 'Official Document Templates & Guidelines',
    news: 'Public Advisory & Community Bulletins',
    reports: 'Document Issuance Reports & Municipal Audit',
    users: 'Resident Verification & Account Management',
    logs: 'System Activity Logs & Security Audit Trail',
    archive: 'Archived Documents & Purge Records',
    account: 'Administrator Profile & Security Credentials',
  };

  const handleNavigateTab = (nextTab) => {
    if (!nextTab || nextTab === activeTab) return;
    setTabTransitioning(true);
    setActiveTab(nextTab);
    try {
      localStorage.setItem('zapatera_admin_active_tab', nextTab);
    } catch {}
    setTimeout(() => {
      setTabTransitioning(false);
    }, 200);
  };

  const isCurrentTabLoading =
    tabTransitioning ||
    (activeTab === 'dashboard'
      ? !isDashboardReady || pageLoadingState.dashboard
      : Boolean(pageLoadingState[activeTab]));

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <>
        {accountDeletedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-red-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
              <button
                onClick={() => setAccountDeletedNotice(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ShieldAlert className="w-8 h-8 text-rose-600" />
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-extrabold tracking-wider uppercase mb-2">
                {accountDeletedNotice.toLowerCase().includes('lock') ? 'Security Lockout' : 'Official Account Notice'}
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {accountDeletedNotice.toLowerCase().includes('lock') ? 'Account Security Locked' : 'Account Terminated'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Official notification from Barangay Zapatera Administration
              </p>

              <div className="my-4 p-3.5 bg-rose-50/70 border border-rose-200 border-l-4 border-l-rose-600 rounded-xl text-left">
                <p className="text-xs text-rose-950 leading-relaxed font-semibold">
                  {accountDeletedNotice}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 mb-5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Barangay Zapatera Administration Office</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  If you think this was done in error, please visit the Barangay Zapatera administration office during official working hours.
                </p>
              </div>

              <button
                onClick={() => setAccountDeletedNotice(null)}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/25 transition-all cursor-pointer"
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        )}
        <AdminLoginPage
          onLoginSuccess={(user) => {
            if (user?.role !== 'admin') {
              StorageService.setCurrentUser(null);
              setCurrentUser(null);
              return;
            }
            StorageService.setCurrentUser(user);
            setCurrentUser(user);
            refreshState({ isInitial: true });
          }}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f7fb] font-sans overflow-hidden">
      {/* Responsive Sidebar (Off-canvas drawer on mobile < 1024px, static on desktop >= 1024px) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        currentUser={currentUser}
        onLogout={handleLogoutRequest}
        loading={!isDashboardReady}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full max-w-full">
        <Navbar
          activeTitle={tabTitles[activeTab]}
          pendingCount={requests.filter((r) => r.status === 'pending').length}
          requests={requests}
          logs={logs}
          onSelectRequest={handleQueueAction}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          currentUser={currentUser}
          onLogout={handleLogoutRequest}
          onNavigate={(tab) => handleNavigateTab(tab)}
        />

        <main className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 w-full max-w-full overflow-x-hidden">
          {/* Global Skeletal Loading State for the Pages with Dashboard Prioritized */}
          {isCurrentTabLoading ? (
            <GlobalPageSkeleton page={activeTab} isDarkMode={false} />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  requests={requests}
                  events={events}
                  logs={logs}
                  setActiveTab={handleNavigateTab}
                  onQueueAction={handleQueueAction}
                />
              )}

              {activeTab === 'receive_request' && (
                <ReceiveRequestView
                  requests={requests}
                  docTypes={docTypes}
                  config={config}
                  onProcessRequest={handleUpdateRequestStatus}
                  onDeleteRequest={handleDeleteRequest}
                  currentUser={currentUser}
                  initialTarget={receiveRequestTarget}
                  onClearTarget={() => setReceiveRequestTarget(null)}
                />
              )}

              {activeTab === 'approved_documents' && (
                <ApprovedDocumentsView
                  requests={requests}
                  docTypes={docTypes}
                  onUpdateRequestStatus={handleUpdateRequestStatus}
                  onDeleteRequest={handleDeleteRequest}
                  config={config}
                  currentUser={currentUser}
                  initialTarget={approvedDocsTarget}
                  onClearTarget={() => setApprovedDocsTarget(null)}
                />
              )}

              {activeTab === 'doc_info' && (
                <DocumentsView
                  docTypes={docTypes}
                  onSaveDocType={handleSaveDocType}
                  onDeleteDocType={handleDeleteDocType}
                  currentUser={currentUser}
                  config={config}
                />
              )}

              {activeTab === 'news' && (
                <NewsView
                  currentUser={currentUser}
                  events={events}
                  onSaveEvent={handleSaveEvent}
                  onDeleteEvent={handleDeleteEvent}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  requests={requests}
                  docTypes={docTypes}
                  currentUser={currentUser}
                  config={config}
                />
              )}

              {activeTab === 'users' && <UserManagementView currentUser={currentUser} />}

              {activeTab === 'archive' && (
                <ArchiveView currentUser={currentUser} isDarkMode={false} />
              )}

              {activeTab === 'logs' && <LogsView logs={logs} />}

              {activeTab === 'account' && (
                <AccountView
                  currentUser={currentUser}
                  onUserUpdated={(updated) => {
                    StorageService.setCurrentUser(updated);
                    setCurrentUser(updated);
                    refreshState();
                  }}
                  onLogout={handleLogoutRequest}
                  isDarkMode={false}
                />
              )}
            </>
          )}

          {/* Global Enterprise Developer & Institution Footer */}
          <GlobalFooter className="mt-8" />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
            <div className="w-14 h-14 bg-rose-50 border-2 border-rose-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <LogOut className="w-7 h-7 text-rose-600" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Confirm Session Sign Out</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to sign out of your Admin session? You will need your credentials to log back in.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Stay Signed In
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
