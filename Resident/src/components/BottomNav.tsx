// Resident/src/components/BottomNav.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Home,
  FileText,
  Clock,
  Megaphone,
  User,
} from 'lucide-react';

export type NavTab = 'home' | 'documents' | 'requests' | 'announcements' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeRequestsCount?: number;
  onRequestClick?: () => void;
}

export default function BottomNav({
  activeTab,
  onTabChange,
  activeRequestsCount = 0,
}: BottomNavProps) {
  return (
    <View style={styles.container}>
      {/* Home Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]}
        onPress={() => onTabChange('home')}
        activeOpacity={0.7}
      >
        <Home
          size={19}
          color={activeTab === 'home' ? '#1d4ed8' : '#64748b'}
          strokeWidth={activeTab === 'home' ? 2.4 : 2}
        />
        <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
          Home
        </Text>
      </TouchableOpacity>

      {/* Documents Catalog Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'documents' && styles.tabItemActive]}
        onPress={() => onTabChange('documents')}
        activeOpacity={0.7}
      >
        <FileText
          size={19}
          color={activeTab === 'documents' ? '#1d4ed8' : '#64748b'}
          strokeWidth={activeTab === 'documents' ? 2.4 : 2}
        />
        <Text style={[styles.tabLabel, activeTab === 'documents' && styles.tabLabelActive]}>
          Documents
        </Text>
      </TouchableOpacity>

      {/* Requests Status Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'requests' && styles.tabItemActive]}
        onPress={() => onTabChange('requests')}
        activeOpacity={0.7}
      >
        <View style={styles.iconWithBadge}>
          <Clock
            size={19}
            color={activeTab === 'requests' ? '#1d4ed8' : '#64748b'}
            strokeWidth={activeTab === 'requests' ? 2.4 : 2}
          />
          {activeRequestsCount > 0 && (
            <View style={styles.reqBadge}>
              <Text style={styles.reqBadgeText}>
                {activeRequestsCount > 9 ? '9+' : activeRequestsCount}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, activeTab === 'requests' && styles.tabLabelActive]}>
          Requests
        </Text>
      </TouchableOpacity>

      {/* Announcements / Bulletins Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'announcements' && styles.tabItemActive]}
        onPress={() => onTabChange('announcements')}
        activeOpacity={0.7}
      >
        <Megaphone
          size={19}
          color={activeTab === 'announcements' ? '#1d4ed8' : '#64748b'}
          strokeWidth={activeTab === 'announcements' ? 2.4 : 2}
        />
        <Text style={[styles.tabLabel, activeTab === 'announcements' && styles.tabLabelActive]}>
          Bulletins
        </Text>
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
        onPress={() => onTabChange('profile')}
        activeOpacity={0.7}
      >
        <User
          size={19}
          color={activeTab === 'profile' ? '#1d4ed8' : '#64748b'}
          strokeWidth={activeTab === 'profile' ? 2.4 : 2}
        />
        <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 66,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.8)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    zIndex: 20,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 14,
    marginHorizontal: 2,
    transition: 'all 0.2s ease',
  } as any,
  tabItemActive: {
    backgroundColor: '#eff6ff',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  iconWithBadge: {
    position: 'relative',
  },
  reqBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  reqBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#ffffff',
  },
});
