// Resident/src/components/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RequestStatus } from '../types';
import { Clock, RefreshCw, CheckCircle2, PackageCheck, XCircle, AlertCircle } from 'lucide-react';

interface BadgeProps {
  status: RequestStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Badge({ status, size = 'md' }: BadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending',
          bg: '#fef3c7',
          border: '#fde68a',
          text: '#92400e',
          icon: <Text style={{ fontSize: size === 'sm' ? 9 : 11 }}>🟠</Text>,
        };
      case 'under_review':
      case 'processing':
        return {
          label: 'Processing',
          bg: '#e0f2fe',
          border: '#bae6fd',
          text: '#0369a1',
          icon: <Text style={{ fontSize: size === 'sm' ? 9 : 11 }}>🔵</Text>,
        };
      case 'ready_for_pickup':
        return {
          label: 'Ready for Pickup',
          bg: '#dcfce7',
          border: '#86efac',
          text: '#15803d',
          icon: <Text style={{ fontSize: size === 'sm' ? 9 : 11 }}>🟢</Text>,
        };
      case 'approved':
      case 'completed':
      case 'issued':
        return {
          label: status === 'completed' ? 'Completed' : 'Approved',
          bg: '#dcfce7',
          border: '#86efac',
          text: '#15803d',
          icon: <Text style={{ fontSize: size === 'sm' ? 9 : 11 }}>🟢</Text>,
        };
      case 'rejected':
      case 'declined':
        return {
          label: 'Declined',
          bg: '#fee2e2',
          border: '#fca5a5',
          text: '#991b1b',
          icon: <Text style={{ fontSize: size === 'sm' ? 9 : 11 }}>🔴</Text>,
        };
      default:
        return {
          label: status,
          bg: '#f1f5f9',
          border: '#e2e8f0',
          text: '#475569',
          icon: <AlertCircle size={size === 'sm' ? 10 : 12} color="#475569" />,
        };
    }
  };

  const config = getStatusConfig();
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingVertical: isSm ? 2 : isLg ? 6 : 4,
          paddingHorizontal: isSm ? 6 : isLg ? 12 : 8,
        },
      ]}
    >
      {config.icon}
      <Text
        style={[
          styles.badgeText,
          {
            color: config.text,
            fontSize: isSm ? 10 : isLg ? 13 : 11,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
