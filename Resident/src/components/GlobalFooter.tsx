// Resident/src/components/GlobalFooter.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GlobalFooter() {
  return (
    <View style={styles.footerContainer}>
      <Text style={styles.systemTitle}>
        Barangay Zapatera Document & Records Management System
      </Text>
      <Text style={styles.developerText}>
        Developed by{' '}
        <Text style={styles.boldText}>
          Binghay, Adam Keith Mardee and Medina, Joshua C.
        </Text>
        {' '}• Powered by{' '}
        <Text style={styles.boldText}>
          Southwestern University PHINMA
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  systemTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 4,
  },
  developerText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 14,
  },
  boldText: {
    fontWeight: '700',
    color: '#1e293b',
  },
});
