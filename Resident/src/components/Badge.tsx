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
          label: 'Pending Review',
          bg: '#fef3c7',
          border: '#fde68a',
          text: '#92400e',
          icon: <Clock size={size === 'sm' ? 10 : 12} color="#92400e" />,
        };
      case 'under_review':
        return {
          label: 'Under Review',
          bg: '#e0f2fe',
          border: '#bae6fd',
          text: '#0369a1',
          icon: <RefreshCw size={size === 'sm' ? 10 : 12} color="#0369a1" />,
        };
      case 'processing':
        return {
          label: 'Processing',
          bg: '#e0e7ff',
          border: '#c7d2fe',
          text: '#3730a3',
          icon: <RefreshCw size={size === 'sm' ? 10 : 12} color="#3730a3" />,
        };
      case 'ready_for_pickup':
        return {
          label: 'Ready for Pickup',
          bg: '#dcfce7',
          border: '#86efac',
          text: '#166534',
          icon: <PackageCheck size={size === 'sm' ? 10 : 12} color="#166534" />,
        };
      case 'completed':
      case 'issued':
      case 'approved':
        return {
          label: 'Completed',
          bg: '#d1fae5',
          border: '#a7f3d0',
          text: '#065f46',
          icon: <CheckCircle2 size={size === 'sm' ? 10 : 12} color="#065f46" />,
        };
      case 'rejected':
      case 'declined':
        return {
          label: 'Rejected',
          bg: '#fee2e2',
          border: '#fca5a5',
          text: '#991b1b',
          icon: <XCircle size={size === 'sm' ? 10 : 12} color="#991b1b" />,
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
