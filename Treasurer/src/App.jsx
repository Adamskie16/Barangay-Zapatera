// Treasurer/src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import TreasurerLoginPage from './features/auth/TreasurerLoginPage';
import TreasurerDashboardView from './features/dashboard/TreasurerDashboardView';
import TreasurerReportsView from './features/reports/TreasurerReportsView';
import AccountView from './features/account/AccountView';
import { StorageService } from './core/storage';
import { supabase, isSupabaseConfigured } from './core/supabase';
import { LogOut, X, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const user = StorageService.getCurrentUser();
    if (user && user.role !== 'treasurer') {
      StorageService.setCurrentUser(null);
      return null;
    }
    return user;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [config, setConfig] = useState(() => StorageService.getConfig());
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Load Initial Financial Data
  const refreshFinancialData = async () => {
    setIsRefreshing(true);
    try {
      const [fetchedRequests, fetchedDocTypes, fetchedConfig] = await Promise.all([
        StorageService.getRequestsAsync(),
        StorageService.getDocTypesAsync(),
        StorageService.getConfigAsync(),
      ]);

      if (fetchedRequests) setRequests(fetchedRequests);
      if (fetchedDocTypes) setDocTypes(fetchedDocTypes);
      if (fetchedConfig) setConfig(fetchedConfig);
    } catch (err) {
      console.warn('Financial data fetch note:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialUser = StorageService.getCurrentUser();
    if (initialUser && initialUser.role !== 'treasurer') {
      StorageService.setCurrentUser(null);
      setCurrentUser(null);
    }
    refreshFinancialData();

    // Subscribe to realtime updates on document_requests
    const unsubscribe = StorageService.subscribeToRequests((freshRequests) => {
      if (freshRequests) {
        setRequests(freshRequests);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user) => {
    if (user?.role !== 'treasurer') {
      StorageService.setCurrentUser(null);
      setCurrentUser(null);
      return;
    }
    setCurrentUser(user);
    refreshFinancialData();
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch {}
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    setIsLogoutModalOpen(false);
  };

  // Compute live financial metrics
  const metrics = useMemo(() => {
    return StorageService.calculateFinancialMetrics(requests, docTypes);
  }, [requests, docTypes]);

  // Auth Guard: Strictly Barangay Treasurer Only
  if (!currentUser || currentUser.role !== 'treasurer') {
    return <TreasurerLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const tabTitles = {
    dashboard: 'Treasurer Dashboard',
    reports: 'Collection Reports & Summaries',
    account: 'My Profile & Account',
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          activeTitle={tabTitles[activeTab] || 'Barangay Treasurer Portal'}
          isRefreshing={isRefreshing}
          onRefresh={refreshFinancialData}
          paidTodayCount={metrics.paidCount}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          currentUser={currentUser}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto pb-12">
            {activeTab === 'dashboard' && (
              <TreasurerDashboardView
                metrics={metrics}
                requests={requests}
                docTypes={docTypes}
                config={config}
                onRefresh={refreshFinancialData}
                onNavigateToReports={() => setActiveTab('reports')}
              />
            )}

            {activeTab === 'reports' && (
              <TreasurerReportsView
                requests={requests}
                docTypes={docTypes}
                config={config}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'account' && (
              <AccountView
                currentUser={currentUser}
                onProfileUpdated={(updated) => setCurrentUser(updated)}
                onLogout={handleLogout}
              />
            )}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-3 text-rose-600">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Sign Out of Treasurer Portal?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Your active session will be securely terminated. You will need to verify your credentials and OTP upon next login.
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
