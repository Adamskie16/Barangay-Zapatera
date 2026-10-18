import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './features/dashboard/DashboardView';
import DocumentsView from './features/documents/DocumentsView';
import NewsView from './features/news/NewsView';
import UsersView from './features/users/UsersView';
import ConfigView from './features/config/ConfigView';
import ReportsView from './features/reports/ReportsView';
import LogsView from './features/logs/LogsView';
import AccountView from './features/account/AccountView';
import ArchiveView from './features/archive/ArchiveView';
import SuperAdminLoginPage from './features/auth/SuperAdminLoginPage';
import { StorageService } from './core/storage';
import { ShieldAlert, Building2, X, LogOut } from 'lucide-react';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  // Mobile responsive drawer state (< 1024px)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem('zapatera_dark_mode');
    } catch {}
  }, []);

  // Local State synchronized with Storage Engine & Supabase
  const [currentUser, setCurrentUser] = useState(StorageService.getCurrentUser());
  const [accountDeletedNotice, setAccountDeletedNotice] = useState(null);
  const [users, setUsers] = useState(StorageService.getUsers());
  const [docTypes, setDocTypes] = useState(StorageService.getDocTypes());
  const [requests, setRequests] = useState(StorageService.getRequests());
  const [events, setEvents] = useState(StorageService.getEvents());
  const [config, setConfig] = useState(StorageService.getConfig());
  const [logs, setLogs] = useState(StorageService.getLogs());
  const [notifications, setNotifications] = useState(StorageService.getNotifications());

  const refreshState = async () => {
    const [usrList, docs, evts, reqs, cfg, logsData, notifs] = await Promise.all([
      StorageService.getUsersAsync(),
      StorageService.getDocTypesAsync(),
      StorageService.getEventsAsync(),
      StorageService.getRequestsAsync(),
      StorageService.getConfigAsync(),
      StorageService.getLogsAsync(),
      StorageService.getNotificationsAsync(),
    ]);
    if (usrList) setUsers(usrList);
    if (docs) setDocTypes(docs);
    if (evts) setEvents(evts);
    if (reqs) setRequests(reqs);
    if (cfg) setConfig(cfg);
    if (logsData) setLogs(logsData);
    if (notifs) setNotifications(notifs);
    const user = StorageService.getCurrentUser();
    if (user && user.role !== 'super_admin') {
      StorageService.setCurrentUser(null);
      setCurrentUser(null);
    } else {
      setCurrentUser(user);
    }
  };

  useEffect(() => {
    const initialUser = StorageService.getCurrentUser();
    if (initialUser && initialUser.role !== 'super_admin') {
      StorageService.setCurrentUser(null);
      setCurrentUser(null);
    }
    refreshState();

    // 1. Cross-tab BroadcastChannel listener for live request status updates & deletions from Admin
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('zapatera_security_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'DOCUMENT_REQUEST_DELETED') {
            const { requestId, trackingNumber } = event.data;
            setRequests((prev) =>
              prev.filter((r) => r.id !== requestId && r.tracking_number !== trackingNumber)
            );
            StorageService.recordDeletedRequest?.(requestId, trackingNumber);
            refreshState();
          } else if (event.data?.type === 'DOCUMENT_REQUEST_UPDATED') {
            const updated = event.data.request;
            if (updated) {
              setRequests((prev) =>
                prev.map((r) =>
                  r.id === updated.id || (updated.tracking_number && r.tracking_number === updated.tracking_number)
                    ? { ...r, ...updated }
                    : r
                )
              );
            }
            refreshState();
          } else if (
            event.data?.type === 'ACCOUNT_DELETED' ||
            event.data?.type === 'ACCOUNT_LOCKED' ||
            event.data?.type === 'ACCOUNT_UNLOCKED'
          ) {
            refreshState();
          }
        };
      } catch (e) {}
    }

    // 2. Storage event listener (fires across tabs on same origin)
    const handleStorageChange = (e) => {
      if (
        e.key === 'zapatera_requests_db' ||
        e.key === 'zapatera_deleted_requests' ||
        e.key === 'zapatera_deleted_accounts' ||
        e.key === 'zapatera_config_db'
      ) {
        refreshState();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Custom event listener for local dispatch
    const handleCustomDeleted = (e) => {
      const { requestId, trackingNumber } = e.detail || {};
      setRequests((prev) =>
        prev.filter((r) => r.id !== requestId && r.tracking_number !== trackingNumber)
      );
      refreshState();
    };
    window.addEventListener('zapatera_request_deleted', handleCustomDeleted);

    // 4. Focus sync
    const handleFocus = () => refreshState();
    window.addEventListener('focus', handleFocus);

    // 5. Periodic polling (every 3 seconds) to immediately sync any delete or status update from Admin via Supabase
    const pollInterval = setInterval(() => {
      StorageService.getRequestsAsync().then((reqs) => {
        if (reqs) setRequests(reqs);
      });
    }, 3000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('zapatera_request_deleted', handleCustomDeleted);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
    };
  }, []);

  const handleLoginSuccess = (user) => {
    if (user?.role !== 'super_admin') {
      StorageService.setCurrentUser(null);
      setCurrentUser(null);
      return;
    }
    setCurrentUser(user);
    refreshState();
  };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogoutRequest = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    refreshState();
  };

  // Handlers for Data Mutations
  const handleDeleteRequest = async (requestId, trackingNumber) => {
    await StorageService.deleteRequest(requestId, trackingNumber, currentUser);
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

  const handleSaveUser = async (userPayload) => {
    await StorageService.saveUser(userPayload, currentUser);
    await refreshState();
  };

  const handleDeleteUser = async (userId) => {
    await StorageService.deleteUser(userId, currentUser);
    await refreshState();
  };

  const handleSaveConfig = async (newConfig) => {
    const updated = await StorageService.saveConfig(newConfig, currentUser);
    setConfig(updated);
    await refreshState();
  };

  const handleSendNotification = async (notifPayload) => {
    await StorageService.addNotification({
      ...notifPayload,
      created_by_email: currentUser?.email,
    });
    await refreshState();
  };

  // Auth Guard
  if (!currentUser || currentUser.role !== 'super_admin') {
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
        <SuperAdminLoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  // Tab Titles Map
  const tabTitles = {
    dashboard: 'Super Admin System Dashboard',
    documents: 'Official Document Generator & Guidelines',
    news: 'Barangay News & Bulletin Management',
    users: 'User Accounts & Roles',
    archive: 'Archive & Trash Management',
    config: 'Global System Configurations',
    reports: 'Document Issuance Reports & Analytics',
    logs: 'System Security Audit Trail',
    account: 'My Account Profile & Security Settings',
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-slate-100 text-slate-800">
      {/* Responsive Sidebar (Off-canvas drawer on mobile < 1024px, static on desktop >= 1024px) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogoutRequest}
        isDarkMode={false}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full max-w-full">
        <Navbar
          activeTitle={tabTitles[activeTab]}
          notificationsCount={notifications.length}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          currentUser={currentUser}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 transition-colors duration-200 w-full max-w-full overflow-x-hidden bg-slate-100 text-slate-800">
          {activeTab === 'dashboard' && (
            <DashboardView
              users={users}
              docTypes={docTypes}
              requests={requests}
              events={events}
              logs={logs}
              config={config}
            />
          )}

          {activeTab === 'documents' && (
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
              isDarkMode={false}
            />
          )}

          {activeTab === 'users' && (
            <UsersView
              users={users}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              isDarkMode={false}
            />
          )}

          {activeTab === 'archive' && (
            <ArchiveView currentUser={currentUser} isDarkMode={false} />
          )}

          {activeTab === 'config' && (
            <ConfigView config={config} onSaveConfig={handleSaveConfig} />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              requests={requests}
              docTypes={docTypes}
              users={users}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'logs' && <LogsView logs={logs} currentUser={currentUser} />}

          {activeTab === 'account' && (
            <AccountView
              currentUser={currentUser}
              onUserUpdated={(updated) => {
                setCurrentUser(updated);
                refreshState();
              }}
              onLogout={handleLogoutRequest}
              isDarkMode={false}
            />
          )}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="rounded-2xl max-w-sm w-full p-6 shadow-2xl border text-center relative overflow-hidden transition-colors bg-white border-slate-200 text-slate-900">
            <div className="w-14 h-14 bg-rose-50 border-2 border-rose-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <LogOut className="w-7 h-7 text-rose-600" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight">Confirm Session Sign Out</h3>
            <p className="text-xs mt-1.5 leading-relaxed text-slate-500">
              Are you sure you want to sign out of your Super Admin session? You will need your credentials to log back in.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
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
