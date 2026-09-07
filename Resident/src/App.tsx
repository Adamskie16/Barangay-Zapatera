// Resident/src/App.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StatusBar,
  StyleSheet,
} from 'react-native';
import {
  ResidentUser,
  DocumentRequest,
  DocumentType,
  BarangayAnnouncement,
  BarangayConfig,
  ResidentNotification,
} from './types';
import { MobileStorage } from './core/storage';
import { supabase, isSupabaseConfigured } from './core/supabase';
import {
  OFFICIAL_DOC_TYPES,
  DEFAULT_BARANGAY_CONFIG,
  SAMPLE_ANNOUNCEMENTS,
  SAMPLE_SAMPLE_REQUESTS,
} from './core/portalData';

// Component Views
import Navbar from './components/Navbar';
import BottomNav, { NavTab } from './components/BottomNav';
import ResidentAuthPage from './features/auth/ResidentAuthPage';
import ResidentDashboard from './features/dashboard/ResidentDashboard';
import DocumentCatalogView from './features/documents/DocumentCatalogView';
import RequirementsModal from './features/documents/RequirementsModal';
import RequestFlowModal from './features/requests/RequestFlowModal';
import RequestTrackingModal from './features/requests/RequestTrackingModal';
import MyRequestsView from './features/requests/MyRequestsView';
import AnnouncementsView from './features/announcements/AnnouncementsView';
import NotificationModal from './features/notifications/NotificationModal';
import ProfileView from './features/profile/ProfileView';

const INITIAL_NOTIFICATIONS: ResidentNotification[] = [
  {
    id: 'notif-1',
    user_id: 'res-sample',
    title: 'Document Ready for Pickup! 🎉',
    message: 'Your Barangay Clearance (Ref: BRGY-2026-004128) is ready for pickup at Express Window 2.',
    type: 'ready_pickup',
    is_read: false,
    link_tab: 'requests',
    created_at: 'Today, 8:00 AM',
  },
  {
    id: 'notif-2',
    user_id: 'res-sample',
    title: 'Public Health Advisory Posted',
    message: 'Free Medical & Dental Mission scheduled for September 12 at the Barangay Gym.',
    type: 'announcement',
    is_read: false,
    link_tab: 'announcements',
    created_at: 'Yesterday, 3:30 PM',
  },
  {
    id: 'notif-3',
    user_id: 'res-sample',
    title: 'Application Under Review',
    message: 'Barangay records clerk is reviewing your Certificate of Residency request.',
    type: 'status_update',
    is_read: true,
    link_tab: 'requests',
    created_at: 'Sep 5, 2026',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [currentUser, setCurrentUser] = useState<ResidentUser | null>(null);
  const [requests, setRequests] = useState<DocumentRequest[]>(SAMPLE_SAMPLE_REQUESTS);
  const [docTypes] = useState<DocumentType[]>(OFFICIAL_DOC_TYPES);
  const [announcements] = useState<BarangayAnnouncement[]>(SAMPLE_ANNOUNCEMENTS);
  const [config] = useState<BarangayConfig>(DEFAULT_BARANGAY_CONFIG);
  const [notifications, setNotifications] = useState<ResidentNotification[]>(INITIAL_NOTIFICATIONS);

  // Modals state
  const [isRequestFlowOpen, setIsRequestFlowOpen] = useState<boolean>(false);
  const [selectedDocForRequest, setSelectedDocForRequest] = useState<DocumentType | null>(null);

  const [isRequirementsModalOpen, setIsRequirementsModalOpen] = useState<boolean>(false);
  const [selectedDocForRequirements, setSelectedDocForRequirements] = useState<DocumentType | null>(null);

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState<boolean>(false);
  const [selectedRequestForTracking, setSelectedRequestForTracking] = useState<DocumentRequest | null>(null);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadResidentSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchResidentRequests();
    }
  }, [currentUser]);

  const loadResidentSession = async () => {
    try {
      const stored = await MobileStorage.getItem('zapatera_resident_session');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  };

  const fetchResidentRequests = async () => {
    if (!currentUser) return;
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('resident_email', currentUser.email)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setRequests(data as DocumentRequest[]);
          return;
        }
      }
    } catch {
      // Handled silently
    }

    try {
      const stored = await MobileStorage.getItem('zapatera_requests_db');
      if (stored) {
        setRequests(JSON.parse(stored));
      }
    } catch {
      // Keep sample requests
    }
  };

  const handleLoginSuccess = async (user: ResidentUser) => {
    try {
      await MobileStorage.setItem('zapatera_resident_session', JSON.stringify(user));
    } catch {
      // Ignore
    }
    setCurrentUser(user);
    setActiveTab('home');
  };

  const handleLogout = async () => {
    try {
      await MobileStorage.removeItem('zapatera_resident_session');
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    setActiveTab('home');
  };

  const handleUpdateProfile = async (updatedFields: Partial<ResidentUser>) => {
    if (!currentUser) return;
    const updatedUser: ResidentUser = {
      ...currentUser,
      ...updatedFields,
    };
    setCurrentUser(updatedUser);
    try {
      await MobileStorage.setItem('zapatera_resident_session', JSON.stringify(updatedUser));
      if (isSupabaseConfigured()) {
        await supabase
          .from('profiles')
          .update({
            ...updatedFields,
            updated_at: new Date().toISOString(),
          })
          .eq('email', currentUser.email);
      }
    } catch {
      // Handled
    }
  };

  const handleRequestSubmitted = async (newReq: DocumentRequest) => {
    const updatedList = [newReq, ...requests];
    setRequests(updatedList);

    // Add in-app notification
    const newNotif: ResidentNotification = {
      id: `notif-${Date.now()}`,
      user_id: currentUser?.id || 'res-user',
      title: 'Request Submitted Successfully',
      message: `Your request for ${newReq.document_title} (Ref: ${newReq.tracking_number}) has been queued.`,
      type: 'status_update',
      is_read: false,
      link_tab: 'requests',
      created_at: 'Just now',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('requests').insert([newReq]);
      }
    } catch {
      // Handled
    }

    try {
      await MobileStorage.setItem('zapatera_requests_db', JSON.stringify(updatedList));
    } catch {
      // Handled
    }
  };

  const handleOpenRequirements = (doc?: DocumentType) => {
    const targetDoc = doc || docTypes[0];
    setSelectedDocForRequirements(targetDoc);
    setIsRequirementsModalOpen(true);
  };

  const handleOpenRequestFlow = (doc?: DocumentType | string) => {
    let targetDoc = docTypes[0];
    if (typeof doc === 'string') {
      targetDoc = docTypes.find((d) => d.id === doc) || docTypes[0];
    } else if (doc) {
      targetDoc = doc;
    }
    setSelectedDocForRequest(targetDoc);
    setIsRequestFlowOpen(true);
  };

  const handleViewRequestDetails = (req: DocumentRequest) => {
    setSelectedRequestForTracking(req);
    setIsTrackingModalOpen(true);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (notif: ResidentNotification) => {
    setIsNotificationModalOpen(false);
    if (notif.link_tab) {
      setActiveTab(notif.link_tab);
    }
  };

  const activeRequestsCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review' || r.status === 'processing' || r.status === 'ready_for_pickup'
  ).length;

  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  // Unauthenticated screen
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <ResidentAuthPage onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Government-Service Navbar */}
      <Navbar
        currentUser={currentUser}
        config={config}
        unreadNotifsCount={unreadNotifsCount}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onOpenProfile={() => setActiveTab('profile')}
        onRequestDocument={() => handleOpenRequestFlow()}
      />

      {/* Screen Body Router */}
      <View style={styles.mainContent}>
        {activeTab === 'home' && (
          <ResidentDashboard
            currentUser={currentUser}
            requests={requests}
            announcements={announcements}
            config={config}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onRequestDocument={(docId) => handleOpenRequestFlow(docId)}
            onOpenRequirements={() => handleOpenRequirements()}
            onViewRequestDetails={handleViewRequestDetails}
            onViewAnnouncement={(ann) => setActiveTab('announcements')}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentCatalogView
            docTypes={docTypes}
            onSelectDocument={(doc) => handleOpenRequestFlow(doc)}
            onViewRequirements={(doc) => handleOpenRequirements(doc)}
          />
        )}

        {activeTab === 'requests' && (
          <MyRequestsView
            requests={requests}
            onViewRequestDetails={handleViewRequestDetails}
            onRequestNew={() => handleOpenRequestFlow()}
          />
        )}

        {activeTab === 'announcements' && (
          <AnnouncementsView announcements={announcements} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            config={config}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
          />
        )}
      </View>

      {/* Accessible Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        activeRequestsCount={activeRequestsCount}
        onRequestClick={() => handleOpenRequestFlow()}
      />

      {/* MODALS */}
      {/* 1. Requirements Guide Modal */}
      <RequirementsModal
        visible={isRequirementsModalOpen}
        doc={selectedDocForRequirements}
        onClose={() => setIsRequirementsModalOpen(false)}
        onProceedToRequest={(doc) => {
          setIsRequirementsModalOpen(false);
          handleOpenRequestFlow(doc);
        }}
      />

      {/* 2. 5-Step Request Flow & Appointment Scheduler */}
      <RequestFlowModal
        visible={isRequestFlowOpen}
        initialDoc={selectedDocForRequest}
        docTypes={docTypes}
        currentUser={currentUser}
        config={config}
        onClose={() => setIsRequestFlowOpen(false)}
        onRequestSubmitted={handleRequestSubmitted}
        onTrackSubmittedRequest={(req) => {
          setSelectedRequestForTracking(req);
          setIsTrackingModalOpen(true);
        }}
      />

      {/* 3. Request Tracking & Claim Pass Modal */}
      <RequestTrackingModal
        visible={isTrackingModalOpen}
        request={selectedRequestForTracking}
        config={config}
        onClose={() => setIsTrackingModalOpen(false)}
        onReRequest={(req) => {
          setIsTrackingModalOpen(false);
          handleOpenRequestFlow(req.document_type_id);
        }}
      />

      {/* 4. Notification Center Modal */}
      <NotificationModal
        visible={isNotificationModalOpen}
        notifications={notifications}
        onClose={() => setIsNotificationModalOpen(false)}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onNotificationClick={handleNotificationClick}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
