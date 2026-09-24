import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { BarangayEvent } from '../../types';
import Badge from '../../components/Badge';
import { formatDate } from '../../core/security';

interface ViewEventsViewProps {
  events: BarangayEvent[];
}

export default function ViewEventsView({ events = [] }: ViewEventsViewProps) {
  const displayEvents = events || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Barangay Announcements & Events</Text>
        <Text style={styles.subtitle}>
          Stay updated with community meetings, health missions, and official programs.
        </Text>
      </View>

      {displayEvents.length > 0 ? (
        <View style={styles.listContainer}>
          {displayEvents.map((item) => (
            <View key={item.id} style={styles.eventCard}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.eventImage} />
              ) : null}

              <View style={styles.cardContent}>
                <View style={styles.badgeRow}>
                  <Badge variant={item.status}>{item.status}</Badge>
                  {item.target_audience ? (
                    <Text style={styles.audienceText}>Target: {item.target_audience.toUpperCase()}</Text>
                  ) : null}
                </View>

                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventDesc}>{item.description}</Text>

                <View style={styles.detailsBox}>
                  {item.event_date ? (
                    <Text style={styles.detailText}>📅 Date: {formatDate(item.event_date)}</Text>
                  ) : null}
                  {item.location ? (
                    <Text style={styles.detailText}>📍 Location: {item.location}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Upcoming Events</Text>
          <Text style={styles.emptySubtitle}>
            There are currently no scheduled public events or assemblies. Please check back later for announcements.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBox: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  listContainer: {
    gap: 16,
  },
  eventCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  eventImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  audienceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60a5fa',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  eventDesc: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsBox: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
