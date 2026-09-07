// Resident/src/features/documents/DocumentCatalogView.tsx
import React, { useState } from 'react';
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
} from 'lucide-react';
import { DocumentType } from '../../types';
import { formatCurrency } from '../../core/security';

interface DocumentCatalogViewProps {
  docTypes: DocumentType[];
  onSelectDocument: (doc: DocumentType) => void;
  onViewRequirements: (doc: DocumentType) => void;
}

const CATEGORIES = ['All', 'Clearance', 'Certificate', 'Indigency', 'Permit', 'General'];

export default function DocumentCatalogView({
  docTypes,
  onSelectDocument,
  onViewRequirements,
}: DocumentCatalogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredDocs = docTypes.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' ||
      (doc.category || 'General').toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const renderIcon = (doc: DocumentType) => {
    switch (doc.icon) {
      case 'ShieldCheck':
        return <ShieldCheck size={22} color="#1d4ed8" />;
      case 'Home':
        return <Home size={22} color="#0284c7" />;
      case 'HeartHandshake':
        return <HeartHandshake size={22} color="#059669" />;
      case 'Briefcase':
        return <Briefcase size={22} color="#7c3aed" />;
      case 'Award':
        return <Award size={22} color="#d97706" />;
      case 'Sparkles':
        return <Sparkles size={22} color="#0d9488" />;
      default:
        return <FileText size={22} color="#1d4ed8" />;
    }
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
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Documents List */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsCount}>
          Available Documents ({filteredDocs.length})
        </Text>

        {filteredDocs.map((doc) => (
          <View key={doc.id} style={styles.docCard}>
            <View style={styles.docCardTop}>
              <View style={styles.iconCircle}>{renderIcon(doc)}</View>
              <View style={styles.docCardInfo}>
                <View style={styles.docTitleRow}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
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
                    <Text style={styles.metaText}>Processing: {doc.processing_days} {doc.processing_days === 1 ? 'Day' : 'Days'}</Text>
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
        ))}

        {filteredDocs.length === 0 && (
          <View style={styles.emptySearchBox}>
            <Search size={36} color="#94a3b8" />
            <Text style={styles.emptySearchTitle}>No matching documents found</Text>
            <Text style={styles.emptySearchSubtitle}>
              Try searching with another keyword like "clearance", "residency", or "indigency".
            </Text>
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
});
