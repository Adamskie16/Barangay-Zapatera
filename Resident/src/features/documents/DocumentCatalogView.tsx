// Resident/src/features/documents/DocumentCatalogView.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Search,
  FileText,
  Clock,
  ShieldCheck,
  Briefcase,
  Home,
  HeartHandshake,
  Award,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { DocumentType } from '../../types';
import { formatCurrency } from '../../core/security';

interface DocumentCatalogViewProps {
  docTypes: DocumentType[];
  onSelectDocument: (doc: DocumentType) => void;
  onViewRequirements: (doc: DocumentType) => void;
}

const CATEGORIES = ['All', 'Clearance', 'Certificate', 'Indigency', 'Permit'];

// Helper to determine the accurate functional category of any document
export const getDocumentCategory = (doc: DocumentType): string => {
  if (doc.category && doc.category.trim()) {
    const rawCat = doc.category.trim().toLowerCase();
    if (rawCat.includes('clearance')) return 'Clearance';
    if (rawCat.includes('indigency') || rawCat.includes('financial')) return 'Indigency';
    if (rawCat.includes('permit') || rawCat.includes('business')) return 'Permit';
    if (
      rawCat.includes('certificate') ||
      rawCat.includes('certification') ||
      rawCat.includes('residency') ||
      rawCat.includes('moral') ||
      rawCat.includes('jobseeker')
    ) {
      return 'Certificate';
    }
  }

  const combined = `${doc.code || ''} ${doc.title || ''} ${doc.description || ''}`.toLowerCase();
  if (combined.includes('clearance')) return 'Clearance';
  if (combined.includes('indigency') || combined.includes('financial') || combined.includes('calamity')) return 'Indigency';
  if (combined.includes('permit') || combined.includes('business') || combined.includes('building') || combined.includes('construction')) return 'Permit';
  if (
    combined.includes('certificate') ||
    combined.includes('certification') ||
    combined.includes('residency') ||
    combined.includes('moral') ||
    combined.includes('jobseeker')
  ) {
    return 'Certificate';
  }

  return 'Certificate';
};

export default function DocumentCatalogView({
  docTypes,
  onSelectDocument,
  onViewRequirements,
}: DocumentCatalogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'fee' | 'time'>('name');

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = { All: docTypes.length };
    CATEGORIES.forEach((cat) => {
      if (cat !== 'All') {
        counts[cat] = docTypes.filter((doc) => getDocumentCategory(doc) === cat).length;
      }
    });
    return counts;
  }, [docTypes]);

  // Filter & Sort
  const filteredDocs = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();

    return docTypes
      .filter((doc) => {
        const docCat = getDocumentCategory(doc);

        const matchesSearch =
          !searchLower ||
          doc.title.toLowerCase().includes(searchLower) ||
          doc.description.toLowerCase().includes(searchLower) ||
          docCat.toLowerCase().includes(searchLower) ||
          (doc.code || '').toLowerCase().includes(searchLower);

        const matchesCategory =
          selectedCategory === 'All' || docCat.toLowerCase() === selectedCategory.toLowerCase();

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'fee') {
          return a.fee - b.fee;
        }
        if (sortBy === 'time') {
          return (a.processing_days || 1) - (b.processing_days || 1);
        }
        // Default: Sort by title A-Z
        return a.title.localeCompare(b.title);
      });
  }, [docTypes, searchQuery, selectedCategory, sortBy]);

  const renderIcon = (doc: DocumentType) => {
    const text = `${doc.code || ''} ${doc.title || ''}`.toLowerCase();
    if (text.includes('clearance')) return <ShieldCheck size={22} color="#1d4ed8" />;
    if (text.includes('residency')) return <Home size={22} color="#0284c7" />;
    if (text.includes('indigency')) return <HeartHandshake size={22} color="#059669" />;
    if (text.includes('jobseeker') || text.includes('business')) return <Briefcase size={22} color="#7c3aed" />;
    if (text.includes('moral')) return <Award size={22} color="#d97706" />;
    return <FileText size={22} color="#1d4ed8" />;
  };

  return (
    <View style={styles.container}>
      {/* Search & Header Bar */}
      <View style={styles.header}>
        <Text style={styles.title}>Barangay Document Services</Text>
        <Text style={styles.subtitle}>
          Browse official clearances, certifications, and permits. Select a document to review requirements or file an online application.
        </Text>

        <View style={styles.searchBox}>
          <Search size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clearance, residency, indigency, permit..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Filter Pills with Item Count */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Quick Sorting Toolbar */}
        <View style={styles.sortBar}>
          <View style={styles.sortBarLeft}>
            <ArrowUpDown size={12} color="#64748b" />
            <Text style={styles.sortBarLabel}>Sort by:</Text>
          </View>
          <View style={styles.sortOptionsRow}>
            <TouchableOpacity
              style={[styles.sortPill, sortBy === 'name' && styles.sortPillActive]}
              onPress={() => setSortBy('name')}
            >
              <Text style={[styles.sortPillText, sortBy === 'name' && styles.sortPillTextActive]}>
                Name (A-Z)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortPill, sortBy === 'fee' && styles.sortPillActive]}
              onPress={() => setSortBy('fee')}
            >
              <Text style={[styles.sortPillText, sortBy === 'fee' && styles.sortPillTextActive]}>
                Fee (Lowest First)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortPill, sortBy === 'time' && styles.sortPillActive]}
              onPress={() => setSortBy('time')}
            >
              <Text style={[styles.sortPillText, sortBy === 'time' && styles.sortPillTextActive]}>
                Processing Time
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Documents List */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>
            Available Documents ({filteredDocs.length})
          </Text>
          {selectedCategory !== 'All' && (
            <TouchableOpacity onPress={() => setSelectedCategory('All')}>
              <Text style={styles.clearFilterText}>Reset filter</Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredDocs.map((doc) => {
          const docCategory = getDocumentCategory(doc);
          return (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docCardTop}>
                <View style={styles.iconCircle}>{renderIcon(doc)}</View>
                <View style={styles.docCardInfo}>
                  <View style={styles.docTitleRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.docTitle}>{doc.title}</Text>
                      <Text style={styles.docCategoryBadge}>{docCategory}</Text>
                    </View>
                    <View style={[styles.feeBadge, doc.fee === 0 ? styles.feeBadgeFree : styles.feeBadgePaid]}>
                      <Text style={[styles.feeBadgeText, doc.fee === 0 ? styles.feeBadgeTextFree : styles.feeBadgeTextPaid]}>
                        {doc.fee === 0 ? 'FREE' : formatCurrency(doc.fee)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.docDesc}>{doc.description}</Text>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Clock size={12} color="#64748b" />
                      <Text style={styles.metaText}>Processing: {doc.processing_days} {Number(doc.processing_days) === 1 ? 'Day' : 'Days'}</Text>
                    </View>
                    {doc.validity && (
                      <View style={styles.metaItem}>
                        <ShieldCheck size={12} color="#64748b" />
                        <Text style={styles.metaText}>Validity: {doc.validity}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Requirements Snippet */}
              {doc.requirements && doc.requirements.length > 0 && (
                <View style={styles.requirementsBox}>
                  <Text style={styles.requirementsTitle}>Core Requirements:</Text>
                  {doc.requirements.slice(0, 2).map((req, i) => (
                    <View key={i} style={styles.reqRow}>
                      <CheckCircle size={12} color="#10b981" />
                      <Text style={styles.reqItemText} numberOfLines={1}>{req}</Text>
                    </View>
                  ))}
                  {doc.requirements.length > 2 && (
                    <Text style={styles.reqMoreText}>+{doc.requirements.length - 2} more requirement(s)</Text>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.reqDetailsBtn}
                  onPress={() => onViewRequirements(doc)}
                >
                  <Info size={14} color="#1d4ed8" />
                  <Text style={styles.reqDetailsBtnText}>Requirements Guide</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.requestNowBtn}
                  onPress={() => onSelectDocument(doc)}
                >
                  <Text style={styles.requestNowBtnText}>Request Online</Text>
                  <ArrowRight size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filteredDocs.length === 0 && (
          <View style={styles.emptySearchBox}>
            <Search size={36} color="#94a3b8" />
            <Text style={styles.emptySearchTitle}>No matching documents found</Text>
            <Text style={styles.emptySearchSubtitle}>
              {selectedCategory !== 'All'
                ? `No documents found in the "${selectedCategory}" category.`
                : 'Try searching with another keyword like "clearance", "residency", or "indigency".'}
            </Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
            >
              <Text style={styles.resetBtnText}>View All Documents</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  categoryScroll: {
    marginTop: 12,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
  },
  docCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  docCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  docCardInfo: {
    flex: 1,
  },
  docTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  feeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feeBadgeFree: {
    backgroundColor: '#dcfce7',
  },
  feeBadgePaid: {
    backgroundColor: '#eff6ff',
  },
  feeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  feeBadgeTextFree: {
    color: '#15803d',
  },
  feeBadgeTextPaid: {
    color: '#1d4ed8',
  },
  docDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  requirementsBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  requirementsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  reqItemText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  reqMoreText: {
    fontSize: 10,
    color: '#1d4ed8',
    fontWeight: '700',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  reqDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  reqDetailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  requestNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  requestNowBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptySearchBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptySearchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
  },
  emptySearchSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  sortOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sortPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sortPillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  sortPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  sortPillTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  docCategoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  resetBtn: {
    marginTop: 14,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
