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
  PlusCircle,
} from 'lucide-react';

export type NavTab = 'home' | 'documents' | 'requests' | 'announcements' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeRequestsCount?: number;
  onRequestClick: () => void;
}

export default function BottomNav({
  activeTab,
  onTabChange,
  activeRequestsCount = 0,
  onRequestClick,
}: BottomNavProps) {
  return (
    <View style={styles.container}>
      {/* Home Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange('home')}
        activeOpacity={0.7}
      >
        <Home
          size={20}
          color={activeTab === 'home' ? '#1d4ed8' : '#64748b'}
        />
        <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
          Home
        </Text>
      </TouchableOpacity>

      {/* Documents Catalog Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange('documents')}
        activeOpacity={0.7}
      >
        <FileText
          size={20}
          color={activeTab === 'documents' ? '#1d4ed8' : '#64748b'}
        />
        <Text style={[styles.tabLabel, activeTab === 'documents' && styles.tabLabelActive]}>
          Documents
        </Text>
      </TouchableOpacity>

      {/* Center Floating Request Button */}
      <TouchableOpacity
        style={styles.centerFab}
        onPress={onRequestClick}
        activeOpacity={0.85}
      >
        <PlusCircle size={26} color="#ffffff" />
        <Text style={styles.fabLabel}>Apply</Text>
      </TouchableOpacity>

      {/* Requests Status Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange('requests')}
        activeOpacity={0.7}
      >
        <View style={styles.iconWithBadge}>
          <Clock
            size={20}
            color={activeTab === 'requests' ? '#1d4ed8' : '#64748b'}
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

      {/* Announcements / Profile Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange('announcements')}
        activeOpacity={0.7}
      >
        <Megaphone
          size={20}
          color={activeTab === 'announcements' ? '#1d4ed8' : '#64748b'}
        />
        <Text style={[styles.tabLabel, activeTab === 'announcements' && styles.tabLabelActive]}>
          Bulletins
        </Text>
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange('profile')}
        activeOpacity={0.7}
      >
        <User
          size={20}
          color={activeTab === 'profile' ? '#1d4ed8' : '#64748b'}
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
    height: 64,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    zIndex: 20,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
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
    top: -4,
    right: -8,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  reqBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
  },
  centerFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  fabLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: -2,
  },
});
