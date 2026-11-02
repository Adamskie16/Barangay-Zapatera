import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ArrowRight,
  Info,
  CheckCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DocumentType } from '../../types';
import { formatCurrency } from '../../core/security';
import { ensureInterFontLoaded } from '../../core/fontSetup';
import GlobalFooter from '../../components/GlobalFooter';

interface DocumentCatalogViewProps {
  docTypes: DocumentType[];
  onSelectDocument: (doc: DocumentType) => void;
  onViewRequirements: (doc: DocumentType) => void;
}

const CATEGORIES = ['All', 'Clearance', 'Certificate', 'Indigency', 'Permit'];

const SORT_OPTIONS: { key: 'name' | 'fee' | 'time'; label: string }[] = [
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'fee', label: 'Lowest Fee' },
  { key: 'time', label: 'Fastest Processing' },
];

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
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    ensureInterFontLoaded();
  }, []);

  // Reset pagination to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

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

  const freeDocsCount = useMemo(
    () => docTypes.filter((d) => Number(d.fee) === 0 && !d.is_variable_fee && d.fee_type !== 'variable').length,
    [docTypes]
  );

  const sameDayDocsCount = useMemo(
    () => docTypes.filter((d) => Number(d.processing_days || 1) <= 1).length,
    [docTypes]
  );

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
        return a.title.localeCompare(b.title);
      });
  }, [docTypes, searchQuery, selectedCategory, sortBy]);

  // Pagination Calculations
  const totalDocs = filteredDocs.length;
  const totalPages = Math.max(1, Math.ceil(totalDocs / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalDocs);

  const paginatedDocs = useMemo(() => {
    return filteredDocs.slice(startIndex, endIndex);
  }, [filteredDocs, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const getDocVisual = (doc: DocumentType) => {
    const text = `${doc.code || ''} ${doc.title || ''}`.toLowerCase();
    if (text.includes('clearance')) {
      return {
        icon: <ShieldCheck size={20} color="#2563eb" />,
        bg: '#eff6ff',
        border: '#dbeafe',
        accent: '#2563eb',
      };
    }
    if (text.includes('residency')) {
      return {
        icon: <Home size={20} color="#0284c7" />,
        bg: '#f0f9ff',
        border: '#bae6fd',
        accent: '#0284c7',
      };
    }
    if (text.includes('indigency')) {
      return {
        icon: <HeartHandshake size={20} color="#059669" />,
        bg: '#ecfdf5',
        border: '#a7f3d0',
        accent: '#059669',
      };
    }
    if (text.includes('jobseeker') || text.includes('business') || text.includes('permit')) {
      return {
        icon: <Briefcase size={20} color="#7c3aed" />,
        bg: '#f5f3ff',
        border: '#ddd6fe',
        accent: '#7c3aed',
      };
    }
    if (text.includes('moral')) {
      return {
        icon: <Award size={20} color="#d97706" />,
        bg: '#fffbeb',
        border: '#fde68a',
        accent: '#d97706',
      };
    }
    return {
      icon: <FileText size={20} color="#2563eb" />,
      bg: '#eff6ff',
      border: '#dbeafe',
      accent: '#2563eb',
    };
  };

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.key === sortBy)?.label || 'Name (A–Z)';

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= 1. PAGE HEADER & SUMMARY STRIP ================= */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextCol}>
            <View style={styles.heroPill}>
              <Layers size={11} color="#2563eb" />
              <Text style={styles.heroPillText}>OFFICIAL BARANGAY CATALOG</Text>
            </View>
            <Text style={styles.heroTitle}>Document Services</Text>
            <Text style={styles.heroSubtitle}>
              Select an official clearance, certificate, or permit to check requirements or apply online.
            </Text>
          </View>
        </View>

        {/* Compact 3-Column Metrics Strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{docTypes.length}</Text>
            <Text style={styles.summaryLabel}>Total Services</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>{freeDocsCount}</Text>
            <Text style={styles.summaryLabel}>Free Certificates</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>{sameDayDocsCount}</Text>
            <Text style={styles.summaryLabel}>1-Day Release</Text>
          </View>
        </View>

        {/* Search Input + Sort Dropdown Trigger Row */}
        <View style={styles.searchAndSortRow}>
          <View style={styles.searchBox}>
            <Search size={16} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search document or category..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchBtn}
                activeOpacity={0.7}
              >
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.sortTriggerBtn, isSortOpen && styles.sortTriggerBtnActive]}
            onPress={() => setIsSortOpen((prev) => !prev)}
            activeOpacity={0.75}
          >
            <ArrowUpDown size={14} color={isSortOpen ? '#1d4ed8' : '#475569'} />
            <Text
              style={[
                styles.sortTriggerText,
                isSortOpen && styles.sortTriggerTextActive,
              ]}
              numberOfLines={1}
            >
              {currentSortLabel}
            </Text>
            <ChevronDown size={13} color={isSortOpen ? '#1d4ed8' : '#64748b'} />
          </TouchableOpacity>
        </View>

        {/* Expandable Sort Dropdown Menu */}
        {isSortOpen && (
          <View style={styles.sortDropdownMenu}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.sortDropdownItem,
                    isSelected && styles.sortDropdownItemActive,
                  ]}
                  onPress={() => {
                    setSortBy(opt.key);
                    setIsSortOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sortDropdownItemText,
                      isSelected && styles.sortDropdownItemTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && <CheckCircle size={14} color="#2563eb" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Horizontal Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
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
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
                <View
                  style={[
                    styles.categoryCountBubble,
                    isSelected && styles.categoryCountBubbleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryCountText,
                      isSelected && styles.categoryCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ================= 2. RESULTS HEADER ================= */}
      <View style={styles.resultsHeaderRow}>
        <Text style={styles.resultsTitle}>
          {selectedCategory === 'All' ? 'All Official Documents' : `${selectedCategory} Documents`}{' '}
          <Text style={styles.resultsCountMuted}>({totalDocs})</Text>
        </Text>

        {(selectedCategory !== 'All' || searchQuery.trim() !== '') && (
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.resetFilterLink}>Reset filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ================= 3. ORGANIZED DOCUMENT CARDS ================= */}
      {paginatedDocs.map((doc) => {
        const docCategory = getDocumentCategory(doc);
        const visual = getDocVisual(doc);
        const isBusinessDoc = (doc.title || '').toLowerCase().includes('business');
        const resolvedFee =
          Number(doc.fee) > 0 ? Number(doc.fee) : isBusinessDoc ? 500 : 0;
        const isFree = resolvedFee === 0;
        const reqList = Array.isArray(doc.requirements) ? doc.requirements : [];

        return (
          <View key={doc.id} style={styles.docCard}>
            {/* Card Header: Icon + Title + Category & Fee Pill */}
            <View style={styles.docCardHeader}>
              <View
                style={[
                  styles.docIconBox,
                  { backgroundColor: visual.bg, borderColor: visual.border },
                ]}
              >
                {visual.icon}
              </View>

              <View style={styles.docHeaderMain}>
                <View style={styles.docTitleTopRow}>
                  <Text style={styles.docTitle} numberOfLines={2}>
                    {doc.title}
                  </Text>
                  <View
                    style={[
                      styles.feePill,
                      isFree ? styles.feePillFree : styles.feePillPaid,
                    ]}
                  >
                    <Text
                      style={[
                        styles.feePillText,
                        isFree ? styles.feePillTextFree : styles.feePillTextPaid,
                      ]}
                    >
                      {isFree ? 'FREE' : formatCurrency(resolvedFee)}
                    </Text>
                  </View>
                </View>

                {/* Inline Meta Pills: Category, Processing Time, Validity */}
                <View style={styles.metaBadgesRow}>
                  <View style={[styles.catBadge, { backgroundColor: visual.bg }]}>
                    <Text style={[styles.catBadgeText, { color: visual.accent }]}>
                      {docCategory}
                    </Text>
                  </View>

                  <View style={styles.metaChip}>
                    <Clock size={11} color="#64748b" />
                    <Text style={styles.metaChipText}>
                      {doc.processing_days || 1}{' '}
                      {Number(doc.processing_days || 1) === 1 ? 'Day' : 'Days'}
                    </Text>
                  </View>

                  <View style={styles.metaChip}>
                    <ShieldCheck size={11} color="#64748b" />
                    <Text style={styles.metaChipText}>
                      {doc.validity ||
                        `${doc.validity_months || 6} ${Number(doc.validity_months || 6) === 1 ? 'Month' : 'Months'} from issuance`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Concise Description */}
            <Text style={styles.docDesc} numberOfLines={2}>
              {doc.description}
            </Text>

            {/* Streamlined Requirements Preview Strip */}
            {reqList.length > 0 && (
              <View style={styles.reqStrip}>
                <View style={styles.reqStripHeader}>
                  <Sparkles size={11} color="#2563eb" />
                  <Text style={styles.reqStripTitle}>
                    Key Requirements ({reqList.length})
                  </Text>
                </View>
                <View style={styles.reqChipsWrap}>
                  {reqList.slice(0, 2).map((req, idx) => (
                    <View key={idx} style={styles.reqItemPill}>
                      <CheckCircle size={11} color="#10b981" />
                      <Text style={styles.reqItemPillText} numberOfLines={1}>
                        {req}
                      </Text>
                    </View>
                  ))}
                  {reqList.length > 2 && (
                    <TouchableOpacity
                      style={styles.moreReqsPill}
                      onPress={() => onViewRequirements(doc)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.moreReqsPillText}>
                        +{reqList.length - 2} more
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Action Buttons Row */}
            <View style={styles.cardFooterActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => onViewRequirements(doc)}
                activeOpacity={0.75}
              >
                <Info size={14} color="#334155" />
                <Text style={styles.secondaryBtnText}>Requirements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => onSelectDocument(doc)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Apply Online</Text>
                <ArrowRight size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* ================= 4. COMPACT PAGINATION BAR ================= */}
      {totalPages > 1 && (
        <View style={styles.paginationBar}>
          <TouchableOpacity
            style={[
              styles.pageArrowBtn,
              safeCurrentPage === 1 && styles.pageArrowBtnDisabled,
            ]}
            onPress={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
            disabled={safeCurrentPage === 1}
            activeOpacity={0.7}
          >
            <ChevronLeft
              size={16}
              color={safeCurrentPage === 1 ? '#94a3b8' : '#1e293b'}
            />
          </TouchableOpacity>

          <Text style={styles.pageIndicatorText}>
            Page <Text style={styles.pageIndicatorBold}>{safeCurrentPage}</Text> of{' '}
            <Text style={styles.pageIndicatorBold}>{totalPages}</Text>
          </Text>

          <TouchableOpacity
            style={[
              styles.pageArrowBtn,
              safeCurrentPage === totalPages && styles.pageArrowBtnDisabled,
            ]}
            onPress={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage === totalPages}
            activeOpacity={0.7}
          >
            <ChevronRight
              size={16}
              color={safeCurrentPage === totalPages ? '#94a3b8' : '#1e293b'}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ================= 5. EMPTY STATE ================= */}
      {filteredDocs.length === 0 && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Search size={24} color="#64748b" />
          </View>
          <Text style={styles.emptyTitle}>No matching documents found</Text>
          <Text style={styles.emptySubtitle}>
            {selectedCategory !== 'All'
              ? `No documents found under "${selectedCategory}".`
              : 'Try searching for "clearance", "residency", "indigency", or "permit".'}
          </Text>
          <TouchableOpacity
            style={styles.emptyResetBtn}
            onPress={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyResetBtnText}>Show All Documents</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Global Developer & Institution Footer */}
      <GlobalFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },

  /* Hero & Filter Card */
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTextCol: {
    flex: 1,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  heroPillText: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 17,
  },

  /* 3-Column Summary Strip */
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },

  /* Search & Sort Row */
  searchAndSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#0f172a',
    padding: 0,
  },
  clearSearchBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 42,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sortTriggerBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  sortTriggerText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  sortTriggerTextActive: {
    color: '#1d4ed8',
  },

  /* Sort Dropdown */
  sortDropdownMenu: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sortDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  sortDropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  sortDropdownItemText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sortDropdownItemTextActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },

  /* Category Filter Pills */
  categoryScroll: {
    marginTop: 12,
  },
  categoryScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryPillText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  categoryCountBubble: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  categoryCountBubbleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  categoryCountText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  categoryCountTextActive: {
    color: '#ffffff',
  },

  /* Results Section Header */
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  resultsTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultsCountMuted: {
    fontWeight: '700',
    color: '#64748b',
  },
  resetFilterLink: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
  },

  /* Document Card */
  docCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  docHeaderMain: {
    flex: 1,
  },
  docTitleTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  docTitle: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
  },
  feePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  feePillFree: {
    backgroundColor: '#dcfce7',
  },
  feePillPaid: {
    backgroundColor: '#eff6ff',
  },
  feePillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
  },
  feePillTextFree: {
    color: '#15803d',
  },
  feePillTextPaid: {
    color: '#1d4ed8',
  },

  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  catBadgeText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaChipText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },

  docDesc: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginTop: 10,
  },

  /* Streamlined Requirements Strip */
  reqStrip: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  reqStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  reqStripTitle: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155',
  },
  reqChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reqItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: '100%',
  },
  reqItemPillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  moreReqsPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    justifyContent: 'center',
  },
  moreReqsPillText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563eb',
  },

  /* Card Footer Actions */
  cardFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  primaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Compact Pagination */
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageArrowBtnDisabled: {
    opacity: 0.4,
  },
  pageIndicatorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  pageIndicatorBold: {
    fontWeight: '800',
    color: '#0f172a',
  },

  /* Empty State */
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  emptyResetBtn: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyResetBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
