// AccountManagement/src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LoginPage from './features/auth/LoginPage';
import AccountCreationView from './features/accounts/AccountCreationView';
import ActivityLogsView from './features/logs/ActivityLogsView';
import LoginDesignView from './features/login_design/LoginDesignView';
import { supabase } from './core/supabase';
import { ShieldAlert, Building2, X, LogOut } from 'lucide-react';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('accounts');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('zapatera_dark_mode') !== 'false';
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('zapatera_dark_mode', String(next));
      return next;
    });
  };

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('zapatera_account_mgmt_session');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed && (parsed.role === 'superadmin' || parsed.role === 'super_admin')) {
        return { ...parsed, role: 'super_admin' };
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [accountDeletedNotice, setAccountDeletedNotice] = useState(null);

  useEffect(() => {
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('zapatera_security_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'ACCOUNT_DELETED') {
          const deletedId = event.data?.userId;
          const deletedEmail = (event.data?.email || '').toLowerCase().trim();
          const stored = localStorage.getItem('zapatera_account_mgmt_session');
          const user = stored ? JSON.parse(stored) : null;
          const myEmail = (user?.email || '').toLowerCase().trim();
          if (deletedId === user?.id || (deletedEmail && deletedEmail === myEmail)) {
            setAccountDeletedNotice('Notice: This account has been deleted by Barangay Zapatera administration. You have been logged out.');
            localStorage.removeItem('zapatera_account_mgmt_session');
            setCurrentUser(null);
          }
        }
      };
    }

    const handleStorageDeleted = (e) => {
      if (e.key === 'zapatera_account_deleted_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const deletedEmail = (parsed.email || '').toLowerCase().trim();
          const stored = localStorage.getItem('zapatera_account_mgmt_session');
          const user = stored ? JSON.parse(stored) : null;
          const myEmail = (user?.email || '').toLowerCase().trim();
          if (parsed.userId === user?.id || (deletedEmail && deletedEmail === myEmail)) {
            setAccountDeletedNotice('Notice: This account has been deleted by Barangay Zapatera administration. You have been logged out.');
            localStorage.removeItem('zapatera_account_mgmt_session');
            setCurrentUser(null);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageDeleted);

    return () => {
      window.removeEventListener('storage', handleStorageDeleted);
      if (bc) bc.close();
    };
  }, []);

  const handleLoginSuccess = (user) => {
    const normalizedUser = {
      ...user,
      role: (user?.role === 'superadmin' || user?.role === 'super_admin') ? 'super_admin' : user?.role,
    };
    localStorage.setItem('zapatera_account_mgmt_session', JSON.stringify(normalizedUser));
    setCurrentUser(normalizedUser);
  };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogoutRequest = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    localStorage.removeItem('zapatera_account_mgmt_session');
    try {
      supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
    setCurrentUser(null);
  };

  // Auth Guard: Only Super Admin accounts are authorized to access portal
  const isSuperAdmin = currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'superadmin');
  if (!isSuperAdmin) {
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
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  const tabTitles = {
    accounts: 'User Account Provisioning & Roles',
    login_design: 'Login Screen Design & Themes',
    logs: 'System Security Audit Trail',
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-200 ${
      isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogoutRequest}
        isDarkMode={isDarkMode}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          activeTitle={tabTitles[activeTab]}
          notificationsCount={0}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          currentUser={currentUser}
        />

        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-full overflow-x-hidden transition-colors duration-200 ${
          isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
        }`}>
          {activeTab === 'accounts' && (
            <AccountCreationView currentUser={currentUser} isDarkMode={isDarkMode} />
          )}
          {activeTab === 'login_design' && (
            <LoginDesignView currentUser={currentUser} isDarkMode={isDarkMode} />
          )}
          {activeTab === 'logs' && (
            <ActivityLogsView currentUser={currentUser} isDarkMode={isDarkMode} />
          )}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl max-w-sm w-full p-6 shadow-2xl border text-center relative overflow-hidden transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-200 dark:border-rose-900/60 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <LogOut className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight">Confirm Session Sign Out</h3>
            <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Are you sure you want to sign out of the Account Provisioning portal? You will need your credentials to log back in.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
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
