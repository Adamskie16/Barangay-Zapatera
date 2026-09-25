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
  SAMPLE_REQUESTS,
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

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [currentUser, setCurrentUser] = useState<ResidentUser | null>(null);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>(OFFICIAL_DOC_TYPES);
  const [announcements, setAnnouncements] = useState<BarangayAnnouncement[]>(SAMPLE_ANNOUNCEMENTS);
  const [config] = useState<BarangayConfig>(DEFAULT_BARANGAY_CONFIG);
  const [notifications, setNotifications] = useState<ResidentNotification[]>([]);

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
    fetchDocTypes();
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchResidentRequests(currentUser);
      fetchResidentNotifications(currentUser);
    } else {
      setRequests([]);
      setNotifications([]);
    }
  }, [currentUser]);

  const loadResidentSession = async () => {
    try {
      const stored = await MobileStorage.getItem('zapatera_resident_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
      }
    } catch {
      // Ignore
    }
  };

  const fetchDocTypes = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('document_types')
          .select('*')
          .eq('is_active', true)
          .order('title', { ascending: true });

        if (!error && data && data.length > 0) {
          const formatted: DocumentType[] = data.map((d: any) => ({
            id: d.id,
            code: d.code,
            title: d.title,
            description: d.description,
            fee: Number(d.fee) || 0,
            processing_days: Number(d.processing_days) || 1,
            requirements: Array.isArray(d.requirements)
              ? d.requirements
              : typeof d.requirements === 'string'
              ? JSON.parse(d.requirements)
              : [],
            is_active: d.is_active !== false,
          }));
          setDocTypes(formatted);
        }
      }
    } catch {
      // fallback to default
    }
  };

  const fetchAnnouncements = async () => {
    try {
      if (isSupabaseConfigured()) {
        const [newsRes, eventsRes] = await Promise.all([
          supabase
            .from('news')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false }),
        ]);

        const newsItems: BarangayAnnouncement[] = (newsRes.data || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          category: (item.category as any) || 'Public Advisory',
          date: new Date(item.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          description: item.description,
          content: item.content || item.description,
          banner_url: item.banner_url || 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&q=80',
          location: item.location || 'Barangay Zapatera, Cebu City',
          author: item.author || 'Barangay Administration',
          is_important: !!item.is_important,
          is_emergency: !!item.is_emergency,
          created_at: item.created_at,
        }));

        const eventItems: BarangayAnnouncement[] = (eventsRes.data || []).map((evt: any) => ({
          id: evt.id,
          title: evt.title,
          category: 'Events',
          date: evt.event_date
            ? new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : new Date(evt.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          description: evt.description,
          content: `${evt.description}\n\n📍 Venue: ${evt.location || 'Barangay Zapatera Multi-Purpose Gym'}\n📅 Event Schedule: ${evt.event_date ? new Date(evt.event_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBA'}`,
          banner_url: evt.image_url || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
          location: evt.location || 'Barangay Zapatera Multi-Purpose Gym',
          author: evt.created_by_name || 'Barangay Office',
          is_important: false,
          is_emergency: false,
          created_at: evt.created_at || evt.event_date,
        }));

        const combined = [...newsItems, ...eventItems].sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          return timeB - timeA;
        });

        if (combined.length > 0) {
          setAnnouncements(combined);
          await MobileStorage.setItem('zapatera_news_db', JSON.stringify(combined));
          return;
        }
      }
    } catch {
      // fallback
    }

    try {
      const stored = await MobileStorage.getItem('zapatera_news_db');
      if (stored) {
        setAnnouncements(JSON.parse(stored));
      }
    } catch {
      // fallback
    }
  };

  const fetchResidentNotifications = async (targetUser?: ResidentUser | null) => {
    const user = targetUser !== undefined ? targetUser : currentUser;
    if (!user) {
      setNotifications([]);
      return;
    }

    let authUserId = user.id;
    if (isSupabaseConfigured()) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          authUserId = authData.user.id;
        }
      } catch {
        // use user.id
      }
    }

    const userNotifsKey = `zapatera_notifications_db_${authUserId || user.email}`;

    try {
      if (isSupabaseConfigured() && authUserId) {
        let query = supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUserId);
        if (isUuid) {
          query = query.or(`user_id.eq.${authUserId},role_target.eq.resident,and(user_id.is.null,role_target.is.null)`);
        } else {
          query = query.or(`role_target.eq.resident,and(user_id.is.null,role_target.is.null)`);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          const formatted: ResidentNotification[] = data.map((n: any) => ({
            id: n.id,
            user_id: n.user_id || authUserId,
            title: n.title,
            message: n.message,
            type: n.type || 'info',
            is_read: n.is_read || false,
            link_tab: (n.link_tab as any) || 'requests',
            created_at: new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          }));
          setNotifications(formatted);
          await MobileStorage.setItem(userNotifsKey, JSON.stringify(formatted));
          return;
        }
      }
    } catch {
      // Fallback to user-scoped storage only
    }

    try {
      const stored = await MobileStorage.getItem(userNotifsKey);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    }
  };

  const fetchResidentRequests = async (targetUser?: ResidentUser | null) => {
    const user = targetUser !== undefined ? targetUser : currentUser;
    if (!user) {
      setRequests([]);
      return;
    }

    let authUserId = user.id;
    if (isSupabaseConfigured()) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          authUserId = authData.user.id;
        }
      } catch {
        // use user.id
      }
    }

    if (!authUserId) {
      setRequests([]);
      return;
    }

    const userRequestsKey = `zapatera_requests_db_${authUserId || user.email}`;

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUserId);
        
        // Strict Account Scoping: If user is authenticated with UUID, query matching resident_id
        if (isUuid) {
          const { data, error } = await supabase
            .from('document_requests')
            .select('*')
            .eq('resident_id', authUserId)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            const formatted: DocumentRequest[] = data.map((req: any) => {
              const matchedDoc = docTypes.find((d) => d.id === req.document_type_id) || {};
              const rawYears = req.years_in_barangay !== undefined && req.years_in_barangay !== null && req.years_in_barangay !== ''
                ? req.years_in_barangay
                : (user.years_in_barangay || 5);
              const formattedYears = String(rawYears).toLowerCase().includes('year') ? String(rawYears) : `${rawYears} years`;
              const normStatus = (req.status || 'pending').toLowerCase();
              const isDeclined = normStatus === 'declined' || normStatus === 'rejected';
              const isClaimed = normStatus === 'completed' || normStatus === 'issued' || Boolean(req.is_claimed) || Boolean(req.claimed_at);
              const isReady = (normStatus === 'ready_for_pickup' || normStatus === 'approved') && !isClaimed && !isDeclined;
              const isUnderReview = normStatus === 'under_review' || normStatus === 'processing';

              return {
                id: req.id,
                tracking_number: req.tracking_number,
                resident_id: req.resident_id,
                resident_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                resident_email: user.email,
                resident_phone: user.phone || req.resident_phone || '',
                resident_address: user.address || user.sitio || req.resident_address || 'Barangay Zapatera, Cebu City',
                resident_birth_date: user.birth_date || user.birthdate || req.resident_birth_date || '',
                civil_status: user.civil_status || req.civil_status || 'Single',
                years_in_barangay: formattedYears,
                document_type_id: req.document_type_id,
                document_title: matchedDoc.title || req.document_title || 'Barangay Clearance',
                fee: matchedDoc.fee !== undefined ? Number(matchedDoc.fee) : (Number(req.fee) || 0),
                purpose: req.purpose,
                requirements_attached: Array.isArray(req.requirements_attached) ? req.requirements_attached : [],
                uploaded_files: Array.isArray(req.uploaded_files) ? req.uploaded_files : [],
                pickup_date: req.pickup_date || 'To be scheduled',
                pickup_time_slot: req.pickup_time_slot || 'Regular Office Hours',
                pickup_location: req.pickup_location || 'Express Window 2, Barangay Hall Lobby, Rahmann St.',
                pickup_instructions: req.pickup_instructions || '',
                status: req.status || 'pending',
                notes: req.notes || '',
                rejection_reason: req.rejection_reason || '',
                declined_reason: req.declined_reason || req.rejection_reason || '',
                declined_details: req.declined_details || '',
                timeline: [
                  {
                    status: 'pending',
                    label: 'Request Submitted',
                    description: 'Document request received online and entered in the barangay records queue.',
                    timestamp: req.created_at ? new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Submitted',
                    is_completed: true,
                    is_current: normStatus === 'pending',
                  },
                  {
                    status: 'under_review',
                    label: 'Under Review',
                    description: 'Barangay staff is reviewing resident information and verifying submitted documents.',
                    timestamp: isUnderReview || isReady || isClaimed || isDeclined ? 'Under Review' : 'Pending Review',
                    is_completed: isUnderReview || isReady || isClaimed || isDeclined,
                    is_current: isUnderReview && !isDeclined,
                  },
                  {
                    status: 'ready_for_pickup',
                    label: isDeclined ? 'Request Declined' : 'Ready for Pick up',
                    description: isDeclined ? (req.declined_reason || 'Application declined due to incomplete or invalid requirements.') : `Document printed, sealed, and approved for pickup at Express Window (${req.pickup_time_slot || 'Window 2'}).`,
                    timestamp: isReady || isClaimed || isDeclined ? (isDeclined ? 'Declined' : (req.pickup_date ? `${req.pickup_date}` : 'Approved')) : `Scheduled for ${req.pickup_date || 'Pickup'}`,
                    is_completed: isReady || isClaimed || isDeclined,
                    is_current: isReady || isDeclined,
                  },
                  {
                    status: 'completed',
                    label: 'Completed',
                    description: 'Official document claimed and successfully released to resident.',
                    timestamp: isClaimed ? (req.claimed_at || req.issued_at ? new Date(req.claimed_at || req.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Claimed') : 'Pending Release',
                    is_completed: isClaimed,
                    is_current: isClaimed,
                  },
                ],
                created_at: req.created_at,
                updated_at: req.updated_at,
              };
            });

            setRequests(formatted);
            await MobileStorage.setItem(userRequestsKey, JSON.stringify(formatted));
            return;
          }
        }
      }
    } catch {
      // Fallback to user-scoped storage only
    }

    try {
      const stored = await MobileStorage.getItem(userRequestsKey);
      if (stored) {
        setRequests(JSON.parse(stored));
      } else {
        setRequests([]);
      }
    } catch {
      setRequests([]);
    }
  };

  const handleLoginSuccess = async (user: ResidentUser) => {
    // 1. Immediately wipe previous user state
    setRequests([]);
    setNotifications([]);
    
    try {
      await MobileStorage.setItem('zapatera_resident_session', JSON.stringify(user));
    } catch {
      // Ignore
    }
    setCurrentUser(user);
    setActiveTab('home');

    // 2. Fetch fresh, account-scoped data for newly authenticated resident
    await fetchResidentRequests(user);
    await fetchResidentNotifications(user);
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
    setRequests([]);
    setNotifications([]);
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
        const isUuid = currentUser.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);
        const updatePayload = {
          ...updatedFields,
          updated_at: new Date().toISOString(),
        };

        if (isUuid) {
          await supabase.from('profiles').update(updatePayload).eq('id', currentUser.id);
        } else {
          await supabase.from('profiles').update(updatePayload).eq('email', currentUser.email);
        }
      }
    } catch {
      // Handled
    }
  };

  const handleRequestSubmitted = async (newReq: DocumentRequest) => {
    if (!currentUser) return;

    let authUserId = currentUser.id;
    if (isSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          authUserId = user.id;
        }
      } catch {
        // fallback to currentUser.id
      }
    }

    const reqWithOwner: DocumentRequest = {
      ...newReq,
      resident_id: authUserId,
    };

    const updatedList = [reqWithOwner, ...requests];
    setRequests(updatedList);

    // Add in-app notification
    const newNotif: ResidentNotification = {
      id: `notif-${Date.now()}`,
      user_id: authUserId || 'res-user',
      title: 'Request Submitted Successfully',
      message: `Your request for ${newReq.document_title} (Ref: ${newReq.tracking_number}) has been queued.`,
      type: 'status_update',
      is_read: false,
      link_tab: 'requests',
      created_at: 'Just now',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    const userRequestsKey = `zapatera_requests_db_${authUserId || currentUser.email}`;
    try {
      await MobileStorage.setItem(userRequestsKey, JSON.stringify(updatedList));
    } catch {
      // Handled
    }

    try {
      if (isSupabaseConfigured() && authUserId) {
        const isDocTypeUuid = newReq.document_type_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newReq.document_type_id);

        let docTypeId = isDocTypeUuid ? newReq.document_type_id : null;
        if (!docTypeId && (newReq.document_type_id || newReq.document_title)) {
          const { data: dRec } = await supabase
            .from('document_types')
            .select('id')
            .or(`code.eq.${newReq.document_type_id},title.eq.${newReq.document_title}`)
            .maybeSingle();
          if (dRec?.id) docTypeId = dRec.id;
        }

        const parsedYears = newReq.years_in_barangay
          ? (parseInt(String(newReq.years_in_barangay).replace(/[^0-9]/g, ''), 10) || 5)
          : (currentUser?.years_in_barangay ? (parseInt(String(currentUser.years_in_barangay).replace(/[^0-9]/g, ''), 10) || 5) : 5);

        const residentFullName = currentUser?.full_name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 'Resident Applicant';

        const payload = {
          tracking_number: newReq.tracking_number,
          resident_id: authUserId,
          document_type_id: docTypeId,
          document_title: newReq.document_title,
          fee: newReq.fee || 0,
          purpose: newReq.purpose,
          requirements_attached: newReq.requirements_attached || [],
          uploaded_files: newReq.uploaded_files || [],
          pickup_date: newReq.pickup_date,
          pickup_time_slot: newReq.pickup_time_slot,
          pickup_location: newReq.pickup_location || 'Express Window 2, Barangay Hall Lobby, Rahmann St.',
          pickup_instructions: newReq.pickup_instructions || '',
          years_in_barangay: parsedYears,
          resident_name: residentFullName,
          resident_email: currentUser?.email || '',
          resident_phone: currentUser?.phone || '',
          resident_address: currentUser?.address || currentUser?.sitio || 'Barangay Zapatera, Cebu City',
          resident_birth_date: currentUser?.birth_date || currentUser?.birthdate || null,
          civil_status: currentUser?.civil_status || 'Single',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('document_requests').insert([payload]);

        // Keep profile years_in_barangay in sync
        if (parsedYears && authUserId) {
          supabase.from('profiles').update({ years_in_barangay: parsedYears }).eq('id', authUserId).catch(() => {});
        }

        // Insert in notifications table
        await supabase.from('notifications').insert([{
          user_id: authUserId,
          title: 'Request Submitted Successfully 📄',
          message: `Your application for ${newReq.document_title} (Tracking: ${newReq.tracking_number}) was received.`,
          type: 'status_update',
          link_tab: 'requests',
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (e) {
      console.error('Error recording document request:', e);
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
        <StatusBar barStyle="dark-content" backgroundColor="#eff2fc" />
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
            docTypes={docTypes}
            announcements={announcements}
            config={config}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onRequestDocument={(doc) => handleOpenRequestFlow(doc)}
            onOpenRequirements={(doc) => handleOpenRequirements(doc)}
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
    backgroundColor: '#eff2fc',
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
