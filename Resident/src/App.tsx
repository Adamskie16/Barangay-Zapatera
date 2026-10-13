import './index.css';
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { AlertTriangle, Megaphone, X } from 'lucide-react';
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
import { registerDeviceSession, checkCurrentSessionActive } from './core/deviceTelemetry';

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
import SecurityNoticeModal from './components/SecurityNoticeModal';
import InactivityNoticeModal from './components/InactivityNoticeModal';
import UnlockAccountModal from './components/UnlockAccountModal';
import {
  initPhoneNotifications,
  triggerCellphoneNotification,
} from './core/phoneNotification';
import PhoneNotificationPermissionBanner from './components/PhoneNotificationPermissionBanner';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [currentUser, setCurrentUser] = useState<ResidentUser | null>(null);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>(OFFICIAL_DOC_TYPES);
  const [announcements, setAnnouncements] = useState<BarangayAnnouncement[]>(SAMPLE_ANNOUNCEMENTS);
  const [config, setConfig] = useState<BarangayConfig>(DEFAULT_BARANGAY_CONFIG);
  const [notifications, setNotifications] = useState<ResidentNotification[]>([]);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState<boolean>(false);

  // Modals state
  const [isRequestFlowOpen, setIsRequestFlowOpen] = useState<boolean>(false);
  const [selectedDocForRequest, setSelectedDocForRequest] = useState<DocumentType | null>(null);
  const [showDocSelectorInFlow, setShowDocSelectorInFlow] = useState<boolean>(false);

  const [isRequirementsModalOpen, setIsRequirementsModalOpen] = useState<boolean>(false);
  const [selectedDocForRequirements, setSelectedDocForRequirements] = useState<DocumentType | null>(null);

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState<boolean>(false);
  const [selectedRequestForTracking, setSelectedRequestForTracking] = useState<DocumentRequest | null>(null);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [accountDeletedNotice, setAccountDeletedNotice] = useState<string | null>(null);
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [selectedAnnouncementForModal, setSelectedAnnouncementForModal] = useState<BarangayAnnouncement | null>(null);
  const [activeAnnouncementBanner, setActiveAnnouncementBanner] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'announcement' | 'info';
    announcement?: BarangayAnnouncement;
  } | null>(null);

  // Early Logout handlers (accessible by all background timers & real-time listeners)
  const handleLogout = async (notice?: string) => {
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
    if (notice) {
      setAccountDeletedNotice(notice);
    }
  };

  const handleInactivityLogout = async (notice?: string) => {
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
    setInactivityNotice(
      notice ||
      'Notice: For your account privacy and security, your session was closed due to inactivity. Your resident account is safe, active, and has NOT been deleted. Please sign in again.'
    );
  };


  const currentUserRef = useRef<ResidentUser | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Set of recently notified announcement keys to prevent duplicated alerts
  const notifiedAnnouncementIdsRef = useRef<Set<string>>(new Set());

  // Master handler: Physically vibrates phone, plays melodic chime, triggers native OS cellphone notification & heads-up banner
  const handleNotifyNewAnnouncement = (newsItem: any, source: string = 'realtime') => {
    if (!newsItem || newsItem.is_published === false) return;
    const itemKey = `${newsItem.id || newsItem.title}_${newsItem.updated_at || newsItem.created_at || ''}`;

    if (notifiedAnnouncementIdsRef.current.has(itemKey)) {
      return;
    }
    notifiedAnnouncementIdsRef.current.add(itemKey);
    if (notifiedAnnouncementIdsRef.current.size > 100) {
      const arr = Array.from(notifiedAnnouncementIdsRef.current);
      notifiedAnnouncementIdsRef.current = new Set(arr.slice(arr.length - 50));
    }

    const isEmergency = !!newsItem.is_emergency;
    const bannerTitle = isEmergency
      ? `🚨 Emergency Advisory: ${newsItem.title}`
      : `📢 New Announcement: ${newsItem.title}`;
    const bannerMessage = newsItem.description || newsItem.content || 'Barangay Zapatera has published a new bulletin.';

    // 1. Physically vibrate cellphone, play melodic chime, and trigger OS System notification tray alert
    triggerCellphoneNotification({
      id: newsItem.id,
      title: newsItem.title,
      message: bannerMessage,
      isEmergency,
      category: newsItem.category || 'Public Advisory',
      banner_url: newsItem.banner_url,
      author: newsItem.author,
      url: '/?tab=announcements',
    });

    // 2. Display the sleek in-app mobile push banner at top of phone screen
    setActiveAnnouncementBanner({
      id: newsItem.id || `ann-${Date.now()}`,
      title: bannerTitle,
      message: bannerMessage,
      type: isEmergency ? 'warning' : 'announcement',
      announcement: {
        id: newsItem.id,
        title: newsItem.title,
        category: newsItem.category || 'Public Advisory',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        description: newsItem.description || '',
        content: newsItem.content || newsItem.description || '',
        banner_url: newsItem.banner_url || '',
        location: newsItem.location || 'Barangay Zapatera, Cebu City',
        author: newsItem.author || 'Barangay Administration',
        is_important: !!newsItem.is_important,
        is_emergency: !!newsItem.is_emergency,
      },
    });

    // 3. Immediately refresh announcements & notifications
    fetchAnnouncements();
    if (currentUserRef.current) {
      fetchResidentNotifications(currentUserRef.current);
    }
  };

  // Auto-dismiss in-app announcement banner after 8 seconds
  useEffect(() => {
    if (activeAnnouncementBanner) {
      const timer = setTimeout(() => {
        setActiveAnnouncementBanner(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeAnnouncementBanner]);

  useEffect(() => {
    // Initialize service worker and cellphone notification audio listener
    initPhoneNotifications();

    loadResidentSession();
    fetchSystemConfig();
    fetchDocTypes();
    fetchAnnouncements();

    // Subscribe to live system configuration updates from SuperAdmin
    let configChannel: any = null;
    let newsChannel: any = null;
    let eventsChannel: any = null;
    let notifsChannel: any = null;
    let broadcastChannel: BroadcastChannel | null = null;

    if (isSupabaseConfigured()) {
      try {
        configChannel = supabase
          .channel('resident-system-config')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'system_config' },
            (payload: any) => {
              if (payload.new) {
                setConfig((prev) => ({
                  ...prev,
                  ...payload.new,
                  seal_url: payload.new.seal_url || payload.new.logo_url || prev.seal_url || '/zapatera_seal.png',
                  logo_url: payload.new.logo_url || payload.new.seal_url || prev.logo_url || '/zapatera_seal.png',
                }));
              }
            }
          )
          .subscribe();

        // Real-time synchronization for News & Announcements
        newsChannel = supabase
          .channel('resident-news-live')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'news' },
            (payload: any) => {
              if (payload?.new && payload.new.is_published !== false) {
                handleNotifyNewAnnouncement(payload.new, 'supabase_realtime');
              } else {
                fetchAnnouncements();
                if (currentUserRef.current) {
                  fetchResidentNotifications(currentUserRef.current);
                }
              }
            }
          )
          .subscribe();

        // Real-time synchronization for Barangay Events
        eventsChannel = supabase
          .channel('resident-events-live')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'events' },
            () => {
              fetchAnnouncements();
            }
          )
          .subscribe();

        // Real-time synchronization for Resident Notifications
        notifsChannel = supabase
          .channel('resident-notifications-live')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications' },
            () => {
              if (currentUserRef.current) {
                fetchResidentNotifications(currentUserRef.current);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription notice:', err);
      }
    }

    // Cross-tab BroadcastChannel listener for immediate news and notifications
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('zapatera_security_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'NEWS_PUBLISHED' && event.data?.news) {
            handleNotifyNewAnnouncement(event.data.news, 'broadcast_channel');
          } else if (event.data?.type === 'NOTIFICATION_SENT') {
            fetchAnnouncements();
            const curr = currentUserRef.current;
            if (curr) {
              fetchResidentNotifications(curr);
              const isTargetUser =
                !event.data?.target_user_id ||
                event.data?.target_user_id === curr.id ||
                (event.data?.target_user_name && event.data?.target_user_name.toLowerCase() === curr.full_name?.toLowerCase());

              if (isTargetUser && event.data?.title) {
                triggerCellphoneNotification({
                  id: `notif-${Date.now()}`,
                  title: event.data.title,
                  message: event.data.message || 'You received a new update from Barangay Zapatera.',
                  isEmergency: false,
                  category: 'Official Reply',
                  url: '/?tab=profile',
                });

                setActiveAnnouncementBanner({
                  id: `banner-${Date.now()}`,
                  title: event.data.title,
                  message: event.data.message || 'You received a new response.',
                  type: 'announcement',
                });
              }
            }
          } else if (event.data?.type === 'NEWS_DELETED') {
            fetchAnnouncements();
          }
        };
      } catch (e) {}
    }

    // Storage event listener for cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'zapatera_notifications_db' ||
        e.key?.startsWith('zapatera_notifications_db_') ||
        e.key === 'zapatera_news_db'
      ) {
        fetchAnnouncements();
        if (currentUserRef.current) {
          fetchResidentNotifications(currentUserRef.current);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }

    // Background polling & wake-up check for newly published announcements
    const checkLatestAnnouncements = async () => {
      try {
        if (!isSupabaseConfigured()) return;
        const { data } = await supabase
          .from('news')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data[0]) {
          const latest = data[0];
          const createdAt = new Date(latest.created_at).getTime();
          const now = Date.now();
          if (now - createdAt < 120000) {
            handleNotifyNewAnnouncement(latest, 'poll');
          }
        }
      } catch {}
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkLatestAnnouncements();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    const bgPollInterval = setInterval(checkLatestAnnouncements, 20000);

    // Listen to service worker click events
    let handleSwMessage: any = null;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      handleSwMessage = (event: any) => {
        if (event.data?.type === 'OPEN_ANNOUNCEMENT_TAB') {
          setActiveTab('announcements');
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      if (configChannel) supabase.removeChannel(configChannel);
      if (newsChannel) supabase.removeChannel(newsChannel);
      if (eventsChannel) supabase.removeChannel(eventsChannel);
      if (notifsChannel) supabase.removeChannel(notifsChannel);
      if (broadcastChannel) broadcastChannel.close();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      clearInterval(bgPollInterval);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && handleSwMessage) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  useEffect(() => {
    let deviceChannel: any = null;

    if (currentUser) {
      fetchResidentRequests(currentUser);
      fetchResidentNotifications(currentUser);

      // Register device telemetry & session
      registerDeviceSession(currentUser);

      // Check if session has been terminated by administrator
      checkCurrentSessionActive(currentUser.id).then((isActive) => {
        if (!isActive) {
          handleInactivityLogout('Notice: Your session has expired or was ended remotely. Your account is active—please sign in again.');
        }
      });

      // Realtime listener for remote session termination
      if (isSupabaseConfigured() && currentUser.id) {
        try {
          deviceChannel = supabase
            .channel(`resident-device-check-${currentUser.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'user_devices',
                filter: `user_id=eq.${currentUser.id}`,
              },
              (payload: any) => {
                if (payload.new && payload.new.is_active === false) {
                  // Admin terminated this session remotely!
                  handleInactivityLogout('Notice: Your device session was ended remotely. Your account remains active—please sign in again.');
                }
              }
            )
            .subscribe();
        } catch {
          // Handled
        }
      }
    } else {
      setRequests([]);
      setNotifications([]);
    }

    return () => {
      if (deviceChannel) {
        supabase.removeChannel(deviceChannel);
      }
    };
  }, [currentUser]);

  // -------------------------------------------------------------
  // TWO-WAY RESIDENT PROFILE REALTIME SYNCHRONIZATION & DELETION LISTENER
  // -------------------------------------------------------------
  useEffect(() => {
    if (!currentUser?.id) return;

    let profileChannel: any = null;
    let broadcastChannel: BroadcastChannel | null = null;

    const deletionNoticeText = 'Notice: Your resident account has been deleted by Barangay Zapatera administration. You have been logged out.';

    // Fresh query cache invalidation & session refresh
    const refreshProfileFromDatabase = async () => {
      if (!isSupabaseConfigured() || !currentUser?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        // 1. If error occurs (network drop, offline, token refreshing, background tab throttled)
        // NEVER log out or show account deletion!
        if (error) {
          console.warn('Transient profile check notice (network or token refresh):', error.message);
          return;
        }

        // 2. Check if explicitly marked inactive
        if (data && data.is_active === false) {
          handleLogout('Notice: Your resident account has been deactivated by Barangay Zapatera administration.');
          return;
        }

        // 3. Check if locked
        if (data && data.is_locked) {
          handleLogout('Notice: Your resident account has been locked. Please unlock via Gmail.');
          return;
        }

        // 4. If profile record was not returned (data is null) with no error:
        if (!data) {
          // Check if session has expired due to inactivity
          const { data: authData, error: authErr } = await supabase.auth.getUser();
          if (authErr || !authData?.user) {
            handleInactivityLogout(
              'Notice: Your resident session has expired due to inactivity. Your account is active and safe. Please sign in again.'
            );
            return;
          }

          // Check fallback by email to see if profile ID had a mismatch
          if (currentUser.email) {
            const { data: emailProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', currentUser.email)
              .maybeSingle();

            if (emailProfile) {
              setCurrentUser(emailProfile);
              return;
            }
          }

          // Check if explicitly recorded in deleted accounts
          const deletedAccountsStr = typeof localStorage !== 'undefined' ? localStorage.getItem('zapatera_deleted_accounts') : null;
          let isExplicitlyDeleted = false;
          if (deletedAccountsStr) {
            try {
              const deletedList = JSON.parse(deletedAccountsStr);
              if (Array.isArray(deletedList) && deletedList.some((d: any) => (d.id === currentUser.id || (d.email && d.email.toLowerCase() === currentUser.email?.toLowerCase())))) {
                isExplicitlyDeleted = true;
              }
            } catch {}
          }

          if (isExplicitlyDeleted) {
            handleLogout(deletionNoticeText);
          } else {
            // Not explicitly deleted - treat as session inactivity timeout
            handleInactivityLogout(
              'Notice: Your resident session has expired. Your account has NOT been deleted. Please sign in again to refresh your session.'
            );
          }
          return;
        }

        setCurrentUser((prev: any) => {
          if (!prev) return data;
          const updated = {
            ...prev,
            ...data,
            push_token: data.push_token || prev.push_token,
          };
          MobileStorage.setItem('zapatera_resident_session', JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        console.warn('Error refreshing resident profile:', err);
      }
    };


    // 1. Supabase Realtime subscription on public.profiles for this resident (Both UPDATE and DELETE)
    if (isSupabaseConfigured()) {
      try {
        profileChannel = supabase
          .channel(`resident-profile-sync-${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${currentUser.id}`,
            },
            (payload: any) => {
              if (payload.eventType === 'DELETE') {
                handleLogout(deletionNoticeText);
                return;
              }

              if (payload?.new) {
                const updatedRow = payload.new;

                // Check if account status has been locked or deactivated
                if (updatedRow.is_locked || updatedRow.is_active === false) {
                  handleLogout('Notice: Your resident account has been deactivated or locked by Barangay Zapatera administration.');
                  return;
                }

                setCurrentUser((prev: any) => {
                  if (!prev) return updatedRow;
                  const updated = {
                    ...prev,
                    ...updatedRow,
                    push_token: updatedRow.push_token || prev.push_token,
                  };
                  MobileStorage.setItem('zapatera_resident_session', JSON.stringify(updated));
                  return updated;
                });
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Error creating profile realtime subscription:', err);
      }
    }

    // 2. Cross-tab BroadcastChannel listener for immediate deletion notification from SuperAdmin / AccountManagement
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('zapatera_security_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'ACCOUNT_DELETED') {
            const deletedId = event.data?.userId;
            const deletedEmail = (event.data?.email || '').toLowerCase().trim();
            const myEmail = (currentUser?.email || '').toLowerCase().trim();

            if (deletedId === currentUser?.id || (deletedEmail && deletedEmail === myEmail)) {
              handleLogout(deletionNoticeText);
            }
          }
        };
      }
    } catch {}

    // 3. Storage event listener (syncs across browser tabs on the same origin)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'zapatera_account_deleted_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const deletedEmail = (parsed.email || '').toLowerCase().trim();
          const myEmail = (currentUser?.email || '').toLowerCase().trim();
          if (parsed.userId === currentUser?.id || (deletedEmail && deletedEmail === myEmail)) {
            handleLogout(deletionNoticeText);
          }
        } catch {}
      }
    };

    // 4. Periodic heartbeat (every 15s) to guarantee deleted users cannot remain logged in
    const heartbeatTimer = setInterval(() => {
      refreshProfileFromDatabase();
    }, 15000);

    const handleFocus = () => {
      refreshProfileFromDatabase();
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshProfileFromDatabase();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (profileChannel && isSupabaseConfigured()) {
        supabase.removeChannel(profileChannel);
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      clearInterval(heartbeatTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [currentUser?.id, currentUser?.email]);

  // -------------------------------------------------------------
  // IDLE POLICY / INACTIVITY SESSION TIMEOUT (20 minutes)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!currentUser) return;

    let idleTimeoutId: any = null;
    const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 minutes of complete inactivity

    const resetInactivityTimer = () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      idleTimeoutId = setTimeout(() => {
        handleInactivityLogout(
          'Notice: Your session was paused after 20 minutes of inactivity to protect your account and records. Your account is active and has NOT been deleted. Please sign in again.'
        );
      }, INACTIVITY_LIMIT_MS);
    };

    resetInactivityTimer();

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    let lastEventTime = Date.now();
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastEventTime > 3000) {
        lastEventTime = now;
        resetInactivityTimer();
      }
    };

    if (typeof window !== 'undefined') {
      activityEvents.forEach((evt) => {
        window.addEventListener(evt, handleUserInteraction, { passive: true });
      });
    }

    return () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      if (typeof window !== 'undefined') {
        activityEvents.forEach((evt) => {
          window.removeEventListener(evt, handleUserInteraction);
        });
      }
    };
  }, [currentUser?.id]);


  const loadResidentSession = async () => {
    try {
      const stored = await MobileStorage.getItem('zapatera_resident_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.role || '').toLowerCase() === 'resident') {
          setCurrentUser(parsed);
        } else {
          await MobileStorage.removeItem('zapatera_resident_session');
          setCurrentUser(null);
        }
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
          const formatted: DocumentType[] = data.map((d: any) => {
            const text = `${d.code || ''} ${d.title || ''} ${d.description || ''}`.toLowerCase();
            let inferredCategory = d.category;
            if (!inferredCategory) {
              if (text.includes('clearance')) inferredCategory = 'Clearance';
              else if (text.includes('indigency') || text.includes('financial')) inferredCategory = 'Indigency';
              else if (text.includes('permit') || text.includes('business')) inferredCategory = 'Permit';
              else if (text.includes('certificate') || text.includes('certification') || text.includes('residency') || text.includes('moral') || text.includes('jobseeker')) inferredCategory = 'Certificate';
              else inferredCategory = 'General';
            }

            let parsedReqs: string[] = [];
            if (Array.isArray(d.requirements)) {
              parsedReqs = d.requirements;
            } else if (typeof d.requirements === 'string') {
              try {
                const parsed = JSON.parse(d.requirements);
                if (Array.isArray(parsed)) parsedReqs = parsed;
                else parsedReqs = [d.requirements];
              } catch {
                parsedReqs = d.requirements.split('\n').map((s: string) => s.trim()).filter(Boolean);
              }
            }

            return {
              id: d.id,
              code: d.code,
              title: d.title,
              category: inferredCategory,
              description: d.description,
              fee: Number(d.fee) || 0,
              processing_days: Number(d.processing_days) || 1,
              validity: d.validity || (Number(d.fee) === 0 ? '3-6 Months' : '6 Months from issuance'),
              requirements: parsedReqs,
              is_active: d.is_active !== false,
            };
          });
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

        // When Supabase responds without error, its result is the absolute source of truth
        if (!newsRes.error && !eventsRes.error) {
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

          // Accurately update state and cache (even if empty because items were deleted)
          setAnnouncements(combined);
          await MobileStorage.setItem('zapatera_news_db', JSON.stringify(combined));
          return;
        }
      }
    } catch (err) {
      console.warn('Live announcements fetch notice:', err);
    }

    // Only fallback to local storage cache if offline or query threw an exception
    try {
      const stored = await MobileStorage.getItem('zapatera_news_db');
      if (stored) {
        setAnnouncements(JSON.parse(stored));
      }
    } catch {
      // fallback
    }
  };

  const fetchSystemConfig = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('system_config')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (data && !error) {
          const formattedConfig: BarangayConfig = {
            ...DEFAULT_BARANGAY_CONFIG,
            ...data,
            seal_url: data.seal_url || data.logo_url || DEFAULT_BARANGAY_CONFIG.seal_url || '/zapatera_seal.png',
            logo_url: data.logo_url || data.seal_url || DEFAULT_BARANGAY_CONFIG.logo_url || '/zapatera_seal.png',
          };
          setConfig(formattedConfig);
          await MobileStorage.setItem('zapatera_system_config_db', JSON.stringify(formattedConfig));
          return;
        }
      }
    } catch {
      // fallback
    }

    try {
      const stored = await MobileStorage.getItem('zapatera_system_config_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig({
          ...DEFAULT_BARANGAY_CONFIG,
          ...parsed,
          seal_url: parsed.seal_url || parsed.logo_url || DEFAULT_BARANGAY_CONFIG.seal_url,
          logo_url: parsed.logo_url || parsed.seal_url || DEFAULT_BARANGAY_CONFIG.logo_url,
        });
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
    const hasValidUuid = Boolean(authUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUserId));
    if (!hasValidUuid && isSupabaseConfigured()) {
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
            link_tab: (n.link_tab as any) || (n.type === 'announcement' || n.type === 'warning' ? 'announcements' : 'requests'),
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
      const [userStored, genStored] = await Promise.all([
        MobileStorage.getItem(userNotifsKey),
        MobileStorage.getItem('zapatera_notifications_db'),
      ]);
      const userList: ResidentNotification[] = userStored ? JSON.parse(userStored) : [];
      const genList: ResidentNotification[] = genStored ? JSON.parse(genStored) : [];

      const map = new Map<string, ResidentNotification>();
      userList.forEach((n) => map.set(n.id, n));
      genList.forEach((n) => {
        if (!map.has(n.id)) {
          map.set(n.id, n);
        }
      });
      const combined = Array.from(map.values()).sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
      });
      setNotifications(combined);
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
    const hasValidUuid = Boolean(authUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUserId));
    if (!hasValidUuid && isSupabaseConfigured()) {
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
    
    if ((user?.role || '').toLowerCase() !== 'resident') {
      try {
        await MobileStorage.removeItem('zapatera_resident_session');
      } catch {}
      setCurrentUser(null);
      return;
    }

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
    const hasValidUuid = Boolean(authUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUserId));
    if (!hasValidUuid && isSupabaseConfigured()) {
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
        const isDocTypeUuid = Boolean(newReq.document_type_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newReq.document_type_id));

        let docTypeId = isDocTypeUuid ? newReq.document_type_id : null;
        if (!docTypeId && (newReq.document_type_id || newReq.document_title)) {
          try {
            const { data: dRec } = await supabase
              .from('document_types')
              .select('id')
              .or(`code.eq.${newReq.document_type_id},title.eq.${newReq.document_title}`)
              .maybeSingle();
            if (dRec?.id) docTypeId = dRec.id;
          } catch {
            // Fallback
          }
        }

        // If docTypeId is still missing, query first valid document type to fulfill NOT NULL foreign key
        if (!docTypeId) {
          try {
            const { data: anyDoc } = await supabase.from('document_types').select('id').limit(1).maybeSingle();
            if (anyDoc?.id) docTypeId = anyDoc.id;
          } catch {
            // Fallback
          }
        }

        const parsedYears = newReq.years_in_barangay
          ? (parseInt(String(newReq.years_in_barangay).replace(/[^0-9]/g, ''), 10) || 5)
          : (currentUser?.years_in_barangay ? (parseInt(String(currentUser.years_in_barangay).replace(/[^0-9]/g, ''), 10) || 5) : 5);

        const residentFullName = currentUser?.full_name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 'Resident Applicant';

        // Parse birth date safely (Postgres DATE expects YYYY-MM-DD or NULL)
        let birthDateVal: string | null = null;
        const rawDob = currentUser?.birth_date || currentUser?.birthdate || (currentUser as any)?.resident_birth_date;
        if (rawDob && typeof rawDob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDob.trim())) {
          birthDateVal = rawDob.trim();
        }

        const notesDetails = [
          newReq.document_title ? `Document: ${newReq.document_title}` : '',
          newReq.fee !== undefined ? `Fee: ₱${newReq.fee}` : '',
          currentUser?.civil_status ? `Civil Status: ${currentUser.civil_status}` : '',
          newReq.pickup_location ? `Pickup Window: ${newReq.pickup_location}` : '',
          newReq.pickup_instructions ? `Instructions: ${newReq.pickup_instructions}` : '',
          newReq.notes || '',
        ].filter(Boolean).join(' | ');

        // Guaranteed schema payload matching public.document_requests table columns
        const payload: any = {
          tracking_number: newReq.tracking_number,
          resident_id: authUserId,
          document_type_id: docTypeId,
          purpose: newReq.purpose || 'Official Document Request',
          requirements_attached: Array.isArray(newReq.requirements_attached) ? newReq.requirements_attached : [],
          uploaded_files: Array.isArray(newReq.uploaded_files) ? newReq.uploaded_files : [],
          years_in_barangay: parsedYears,
          pickup_date: newReq.pickup_date || null,
          pickup_time_slot: newReq.pickup_time_slot || null,
          status: 'pending',
          notes: notesDetails,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (birthDateVal) {
          payload.resident_birth_date = birthDateVal;
        }

        const { error: insertErr } = await supabase.from('document_requests').insert([payload]);
        if (insertErr) {
          console.error('Error inserting document_request:', insertErr.message);
        }

        // Keep profile years_in_barangay and civil_status in sync on public.profiles
        if (authUserId) {
          try {
            const profileUpdates: any = { updated_at: new Date().toISOString() };
            if (parsedYears) profileUpdates.years_in_barangay = parsedYears;
            if (currentUser?.civil_status) profileUpdates.civil_status = currentUser.civil_status;
            await supabase.from('profiles').update(profileUpdates).eq('id', authUserId);
          } catch (syncErr) {
            console.warn('Profile sync notice:', syncErr);
          }
        }

        // Insert in notifications table safely
        try {
          await supabase.from('notifications').insert([{
            user_id: authUserId,
            title: 'Request Submitted Successfully 📄',
            message: `Your application for ${newReq.document_title} (Tracking: ${newReq.tracking_number}) was received.`,
            type: 'status_update',
            link_tab: 'requests',
            is_read: false,
            created_at: new Date().toISOString(),
          }]);
        } catch (notifErr) {
          console.warn('Notification insert notice:', notifErr);
        }
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

  const handleOpenRequestFlow = (doc?: DocumentType | string, fromRequestsPage = false) => {
    let targetDoc = docTypes[0];
    if (typeof doc === 'string') {
      targetDoc = docTypes.find((d) => d.id === doc) || docTypes[0];
    } else if (doc) {
      targetDoc = doc;
    }
    setSelectedDocForRequest(targetDoc);
    setShowDocSelectorInFlow(fromRequestsPage);
    setIsRequestFlowOpen(true);
  };

  const handleViewRequestDetails = (req: DocumentRequest) => {
    setSelectedRequestForTracking(req);
    setIsTrackingModalOpen(true);
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    if (!currentUser) return;
    const authUserId = currentUser.id;
    const userNotifsKey = `zapatera_notifications_db_${authUserId || currentUser.email}`;
    try {
      const stored = await MobileStorage.getItem(userNotifsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map((n: any) => (n.id === id ? { ...n, is_read: true } : n));
        await MobileStorage.setItem(userNotifsKey, JSON.stringify(updated));
      }
      if (isSupabaseConfigured() && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      }
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (!currentUser) return;
    const authUserId = currentUser.id;
    const userNotifsKey = `zapatera_notifications_db_${authUserId || currentUser.email}`;
    try {
      const stored = await MobileStorage.getItem(userNotifsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map((n: any) => ({ ...n, is_read: true }));
        await MobileStorage.setItem(userNotifsKey, JSON.stringify(updated));
      }
      if (isSupabaseConfigured() && authUserId) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .or(`user_id.eq.${authUserId},role_target.eq.resident`);
      }
    } catch {}
  };

  const handleNotificationClick = (notif: ResidentNotification) => {
    setIsNotificationModalOpen(false);

    // If notification is an announcement or bulletin
    if (notif.link_tab === 'announcements' || notif.type === 'announcement' || notif.type === 'warning') {
      setActiveTab('announcements');

      // Extract raw title
      const cleanTitle = notif.title
        .replace(/^(🚨\s*Emergency Advisory:\s*|📢\s*Important Announcement:\s*|📰\s*News Bulletin:\s*|📅\s*Upcoming Event:\s*)/i, '')
        .trim()
        .toLowerCase();

      const matchedAnn = announcements.find((a) => {
        const aTitle = (a.title || '').trim().toLowerCase();
        return aTitle === cleanTitle || aTitle.includes(cleanTitle) || cleanTitle.includes(aTitle);
      });

      if (matchedAnn) {
        setSelectedAnnouncementForModal(matchedAnn);
      }
      return;
    }

    if (notif.link_tab) {
      setActiveTab(notif.link_tab);
    }
  };

  const activeRequestsCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review' || r.status === 'processing' || r.status === 'ready_for_pickup'
  ).length;

  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  // Unauthenticated screen or Non-Resident role
  if (!currentUser || (currentUser.role || '').toLowerCase() !== 'resident') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#eff2fc" />
        {/* Security Notice Modal (for Account Deletion, Deactivation, or Lockout) */}
        <SecurityNoticeModal
          visible={Boolean(accountDeletedNotice)}
          type={
            accountDeletedNotice?.toLowerCase().includes('lock')
              ? 'locked'
              : accountDeletedNotice?.toLowerCase().includes('deactivated')
              ? 'inactive'
              : 'deleted'
          }
          message={accountDeletedNotice || undefined}
          onClose={() => setAccountDeletedNotice(null)}
          onUnlock={() => {
            setAccountDeletedNotice(null);
            setIsUnlockModalOpen(true);
          }}
        />

        {/* Dedicated Inactivity / Session Timeout Modal */}
        <InactivityNoticeModal
          visible={Boolean(inactivityNotice)}
          message={inactivityNotice || undefined}
          onClose={() => setInactivityNotice(null)}
        />

        {/* Global Unlock Account Modal */}
        <UnlockAccountModal
          visible={isUnlockModalOpen}
          onClose={() => setIsUnlockModalOpen(false)}
          onUnlocked={() => {
            setIsUnlockModalOpen(false);
          }}
        />

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

      {/* Permission banner for phone notifications */}
      <PhoneNotificationPermissionBanner />

      {/* Top Real-Time Cellphone Push Announcement Banner */}
      {activeAnnouncementBanner && (
        <View
          style={[
            styles.floatingBanner,
            activeAnnouncementBanner.type === 'warning'
              ? styles.floatingBannerEmergency
              : styles.floatingBannerNormal,
          ]}
        >
          <View style={styles.floatingBannerTopHeader}>
            <View style={styles.floatingBannerAppTag}>
              <View
                style={[
                  styles.appDot,
                  {
                    backgroundColor:
                      activeAnnouncementBanner.type === 'warning' ? '#ef4444' : '#3b82f6',
                  },
                ]}
              />
              <Text style={styles.floatingBannerAppLabel}>
                BARANGAY ZAPATERA • CELLPHONE ALERT
              </Text>
            </View>
            <Text style={styles.floatingBannerTime}>Just now</Text>
          </View>
          <View style={styles.floatingBannerMainRow}>
            <View style={styles.floatingBannerIconCircle}>
              {activeAnnouncementBanner.type === 'warning' ? (
                <AlertTriangle size={18} color="#ffffff" />
              ) : (
                <Megaphone size={18} color="#ffffff" />
              )}
            </View>
            <View style={styles.floatingBannerTextCol}>
              <Text style={styles.floatingBannerTitle} numberOfLines={1}>
                {activeAnnouncementBanner.title}
              </Text>
              <Text style={styles.floatingBannerMsg} numberOfLines={2}>
                {activeAnnouncementBanner.message}
              </Text>
            </View>
            <View style={styles.floatingBannerActions}>
              <TouchableOpacity
                style={styles.floatingBannerActionBtn}
                onPress={() => {
                  setActiveTab('announcements');
                  if (activeAnnouncementBanner.announcement) {
                    setSelectedAnnouncementForModal(activeAnnouncementBanner.announcement);
                  }
                  setActiveAnnouncementBanner(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.floatingBannerActionText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.floatingBannerDismissBtn}
                onPress={() => setActiveAnnouncementBanner(null)}
                activeOpacity={0.7}
              >
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
            onRequestNew={() => handleOpenRequestFlow(undefined, true)}
          />
        )}

        {activeTab === 'announcements' && (
          <AnnouncementsView
            announcements={announcements}
            selectedAnnouncement={selectedAnnouncementForModal}
            onCloseAnnouncementModal={() => setSelectedAnnouncementForModal(null)}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            config={config}
            announcements={announcements}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
            onViewAnnouncement={(ann) => {
              setSelectedAnnouncementForModal(ann);
              setActiveTab('announcements');
            }}
            onNavigateTab={(tab: any) => setActiveTab(tab)}
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
        docTypes={docTypes}
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
        showDocSelector={showDocSelectorInFlow}
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
    minHeight: '100vh' as any,
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    height: '100vh' as any,
    maxHeight: '100vh' as any,
    minHeight: '100vh' as any,
    overflow: 'hidden' as any,
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#f8fafc',
    overflow: 'hidden' as any,
    position: 'relative' as any,
  },


  floatingBanner: {
    position: 'absolute',
    top: 65,
    left: 16,
    right: 16,
    zIndex: 9999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
  },
  floatingBannerTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingBannerAppTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  floatingBannerAppLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  floatingBannerTime: {
    fontSize: 9,
    color: '#64748b',
  },
  floatingBannerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingBannerNormal: {
    backgroundColor: '#0f172a',
    borderColor: '#3b82f6',
  },
  floatingBannerEmergency: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
  },
  floatingBannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  floatingBannerTextCol: {
    flex: 1,
    marginRight: 8,
  },
  floatingBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  floatingBannerMsg: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 2,
    lineHeight: 14,
  },
  floatingBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingBannerActionBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  floatingBannerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  floatingBannerDismissBtn: {
    padding: 6,
  },
});
