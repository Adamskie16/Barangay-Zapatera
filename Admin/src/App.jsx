import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './features/dashboard/DashboardView';
import ReceiveRequestView from './features/requests/ReceiveRequestView';
import ProcessDocumentsView from './features/requests/ProcessDocumentsView';
import ApprovedDocumentsView from './features/requests/ApprovedDocumentsView';
import DocumentsView from './features/documents/DocumentsView';
import NewsView from './features/news/NewsView';
import EventsView from './features/events/EventsView';
import ReportsView from './features/reports/ReportsView';
import LogsView from './features/logs/LogsView';
import UserManagementView from './features/users/UserManagementView';
import AccountView from './features/account/AccountView';
import AdminLoginPage from './features/auth/AdminLoginPage';
import { StorageService } from './core/storage';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentUser, setCurrentUser] = useState(StorageService.getCurrentUser());
  const [requests, setRequests] = useState(StorageService.getRequests());
  const [docTypes, setDocTypes] = useState(StorageService.getDocTypes());
  const [events, setEvents] = useState(StorageService.getEvents());
  const [logs, setLogs] = useState(StorageService.getLogs());
  const [config] = useState(StorageService.getConfig());

  const refreshState = async () => {
    const [reqs, docs, evts, logsData] = await Promise.all([
      StorageService.getRequestsAsync(),
      StorageService.getDocTypesAsync(),
      StorageService.getEventsAsync(),
      StorageService.getLogsAsync(),
    ]);
    if (reqs) setRequests(reqs);
    if (docs) setDocTypes(docs);
    if (evts) setEvents(evts);
    if (logsData) setLogs(logsData);
    setCurrentUser(StorageService.getCurrentUser());
  };

  useEffect(() => {
    refreshState();
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    refreshState();
  };

  const handleUpdateRequestStatus = async (updatedReq) => {
    await StorageService.saveRequest(updatedReq, currentUser);
    await refreshState();
  };

  const handleSaveDocType = async (docTypePayload) => {
    await StorageService.saveDocType(docTypePayload);
    await refreshState();
  };

  const handleDeleteDocType = async (docTypeId) => {
    await StorageService.deleteDocType(docTypeId);
    await refreshState();
  };

  const handleSaveEvent = async (eventPayload) => {
    await StorageService.saveEvent(eventPayload);
    await refreshState();
  };

  const handleDeleteEvent = async (eventId) => {
    await StorageService.deleteEvent(eventId);
    await refreshState();
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    refreshState();
  };

  // Auth Guard
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return <AdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const tabTitles = {
    dashboard: 'Barangay Admin Operations Dashboard',
    receive_request: 'Receive Application Requests Inbox',
    process_documents: 'Process & Verify Document Requirements',
    approved_documents: 'Approved Documents & Digital Certificates',
    doc_info: 'Document Guidelines & Information',
    news: 'Barangay News & Public Bulletins',
    events: 'Barangay Events & Community Notices',
    reports: 'Operational Processing Reports',
    users: 'User Account & Security Management',
    logs: 'Admin Action History Logs',
    account: 'Account Profile & Security Settings',
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          activeTitle={tabTitles[activeTab]}
          pendingCount={requests.filter((r) => r.status === 'pending').length}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              requests={requests}
              events={events}
              logs={logs}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'receive_request' && (
            <ReceiveRequestView
              requests={requests}
              docTypes={docTypes}
              config={config}
              onProcessRequest={handleUpdateRequestStatus}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'process_documents' && (
            <ProcessDocumentsView
              requests={requests}
              onUpdateRequestStatus={handleUpdateRequestStatus}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'approved_documents' && (
            <ApprovedDocumentsView
              requests={requests}
              onUpdateRequestStatus={handleUpdateRequestStatus}
              config={config}
            />
          )}

          {activeTab === 'doc_info' && (
            <DocumentsView
              docTypes={docTypes}
              onSaveDocType={handleSaveDocType}
              onDeleteDocType={handleDeleteDocType}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'news' && (
            <NewsView currentUser={currentUser} />
          )}

          {activeTab === 'events' && (
            <EventsView
              events={events}
              onSaveEvent={handleSaveEvent}
              onDeleteEvent={handleDeleteEvent}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'reports' && <ReportsView requests={requests} />}

          {activeTab === 'users' && <UserManagementView currentUser={currentUser} />}

          {activeTab === 'logs' && <LogsView logs={logs} />}

          {activeTab === 'account' && (
            <AccountView
              currentUser={currentUser}
              onUserUpdated={(updated) => {
                setCurrentUser(updated);
                refreshState();
              }}
              onLogout={handleLogout}
              isDarkMode={false}
            />
          )}
        </main>
      </div>
    </div>
  );
}
