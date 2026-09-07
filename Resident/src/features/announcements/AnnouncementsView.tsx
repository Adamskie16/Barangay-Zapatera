// Resident/src/features/announcements/AnnouncementsView.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import {
  Search,
  Megaphone,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  X,
  Share2,
  Bookmark,
  ArrowRight,
  Info,
} from 'lucide-react';
import { BarangayAnnouncement, AnnouncementCategory } from '../../types';

interface AnnouncementsViewProps {
  announcements: BarangayAnnouncement[];
  selectedAnnouncement?: BarangayAnnouncement | null;
  onCloseAnnouncementModal?: () => void;
}

const CATEGORIES: ('All' | AnnouncementCategory)[] = [
  'All',
  'Emergency',
  'Public Advisory',
  'Government Services',
  'Community',
  'Events',
  'Maintenance',
];

export default function AnnouncementsView({
  announcements,
  selectedAnnouncement: initialSelected,
}: AnnouncementsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeModalItem, setActiveModalItem] = useState<BarangayAnnouncement | null>(initialSelected || null);

  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || ann.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Barangay Bulletins & News</Text>
        <Text style={styles.subtitle}>
          Official public advisories, community programs, emergency notices, and schedule updates.
        </Text>

        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bulletins, events, advisories..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
                cat === 'Emergency' && styles.categoryPillEmergency,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextActive,
                  cat === 'Emergency' && selectedCategory !== 'Emergency' && styles.categoryPillTextEmergency,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Announcements List */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredAnnouncements.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.card,
              item.is_emergency && styles.cardEmergency,
              item.is_important && !item.is_emergency && styles.cardImportant,
            ]}
            onPress={() => setActiveModalItem(item)}
            activeOpacity={0.85}
          >
            {item.banner_url && (
              <Image source={{ uri: item.banner_url }} style={styles.cardImage} />
            )}

            <View style={styles.cardBody}>
              <View style={styles.cardMetaRow}>
                <View
                  style={[
                    styles.categoryBadge,
                    item.is_emergency ? styles.categoryBadgeEmergency : styles.categoryBadgeDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      item.is_emergency && styles.categoryBadgeTextEmergency,
                    ]}
                  >
                    {item.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.cardDate}>{item.date}</Text>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>

              <View style={styles.cardFooter}>
                {item.location && (
                  <View style={styles.locationRow}>
                    <MapPin size={12} color="#64748b" />
                    <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                  </View>
                )}
                <View style={styles.readMoreRow}>
                  <Text style={styles.readMoreText}>Read Bulletin</Text>
                  <ArrowRight size={12} color="#1d4ed8" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filteredAnnouncements.length === 0 && (
          <View style={styles.emptyBox}>
            <Megaphone size={36} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No announcements found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with another keyword or selecting "All" categories.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Full Announcement Reader Modal */}
      {activeModalItem && (
        <Modal visible={true} animationType="slide" transparent onRequestClose={() => setActiveModalItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalCategoryBadge}>
                  <Text style={styles.modalCategoryText}>{activeModalItem.category.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveModalItem(null)} style={styles.modalCloseBtn}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {activeModalItem.banner_url && (
                  <Image source={{ uri: activeModalItem.banner_url }} style={styles.modalBanner} />
                )}

                <Text style={styles.modalTitleText}>{activeModalItem.title}</Text>

                <View style={styles.modalMetaCard}>
                  <View style={styles.modalMetaItem}>
                    <Calendar size={13} color="#64748b" />
                    <Text style={styles.modalMetaLabel}>Date: <Text style={styles.modalMetaVal}>{activeModalItem.date}</Text></Text>
                  </View>
                  {activeModalItem.location && (
                    <View style={styles.modalMetaItem}>
                      <MapPin size={13} color="#64748b" />
                      <Text style={styles.modalMetaLabel}>Venue: <Text style={styles.modalMetaVal}>{activeModalItem.location}</Text></Text>
                    </View>
                  )}
                  {activeModalItem.author && (
                    <View style={styles.modalMetaItem}>
                      <User size={13} color="#64748b" />
                      <Text style={styles.modalMetaLabel}>Issued by: <Text style={styles.modalMetaVal}>{activeModalItem.author}</Text></Text>
                    </View>
                  )}
                </View>

                <Text style={styles.modalContentText}>{activeModalItem.content}</Text>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.closeFullBtn} onPress={() => setActiveModalItem(null)}>
                  <Text style={styles.closeFullBtnText}>Close Bulletin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
    lineHeight: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  categoryPillEmergency: {
    borderColor: '#fecdd3',
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  categoryPillTextEmergency: {
    color: '#be123c',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardEmergency: {
    borderColor: '#fecdd3',
    borderWidth: 1.5,
  },
  cardImportant: {
    borderColor: '#bfdbfe',
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#cbd5e1',
  },
  cardBody: {
    padding: 14,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  categoryBadgeDefault: {
    backgroundColor: '#f1f5f9',
  },
  categoryBadgeEmergency: {
    backgroundColor: '#ffe4e6',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
  },
  categoryBadgeTextEmergency: {
    color: '#e11d48',
  },
  cardDate: {
    fontSize: 10,
    color: '#94a3b8',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingRight: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#64748b',
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalCategoryBadge: {
    backgroundColor: '#eff6ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  modalCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalBanner: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 14,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    lineHeight: 24,
  },
  modalMetaCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
    marginBottom: 14,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalMetaLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  modalMetaVal: {
    fontWeight: '700',
    color: '#0f172a',
  },
  modalContentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    whiteSpace: 'pre-line',
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  closeFullBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeFullBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
