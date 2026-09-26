// AccountManagement/src/App.jsx
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LoginPage from './features/auth/LoginPage';
import AccountCreationView from './features/accounts/AccountCreationView';
import ActivityLogsView from './features/logs/ActivityLogsView';
import LoginDesignView from './features/login_design/LoginDesignView';
import { supabase } from './core/supabase';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('accounts');
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
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (user) => {
    localStorage.setItem('zapatera_account_mgmt_session', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('zapatera_account_mgmt_session');
    try {
      supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
    setCurrentUser(null);
  };

  // Auth Guard: Only Super Admin accounts are authorized to access portal
  if (!currentUser || currentUser.role !== 'super_admin') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
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
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          activeTitle={tabTitles[activeTab]}
          notificationsCount={0}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />

        <main className={`flex-1 overflow-y-auto p-6 transition-colors duration-200 ${
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
    </div>
  );
}
