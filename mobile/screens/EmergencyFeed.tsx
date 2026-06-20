import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function EmergencyFeed({ backendUrl = 'http://127.0.0.1:5000' }: { backendUrl?: string }) {
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEmergencies = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/emergencies`);
      if (!response.ok) {
        throw new Error("Failed to fetch emergencies");
      }
      const data = await response.json();
      setEmergencies(data);
    } catch (error) {
      console.error("Error fetching emergencies for mobile feed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return styles.priorityCritical;
      case 'HIGH':
        return styles.priorityHigh;
      case 'MEDIUM':
        return styles.priorityMedium;
      default:
        return styles.priorityLow;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ACTIVE SIGNALS</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchEmergencies} disabled={loading}>
          <Text style={styles.refreshBtnText}>SYNC</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#f43f5e" />
      ) : (
        <FlatList
          data={emergencies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No emergency signals captured in this sector yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sender}>Source: Node {item.sender}</Text>
                <View style={[styles.priorityBadge, getPriorityStyle(item.priority)]}>
                  <Text style={styles.priorityText}>{item.priority || 'PENDING'}</Text>
                </View>
              </View>

              <Text style={styles.messageText}>"{item.text}"</Text>

              {item.meshPath && (
                <View style={styles.meshPathContainer}>
                  <Text style={styles.meshPathLabel}>Mesh Forwarding Path:</Text>
                  <Text style={styles.meshPathRoute}>{item.meshPath.join(" ➔ ")}</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                <Text style={styles.resourceText}>
                  Allocated: <Text style={styles.resourceVal}>{item.resourceNeeded || 'Awaiting Allocation...'}</Text>
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  refreshBtn: { backgroundColor: '#27272a', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  refreshBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { padding: 20 },
  emptyText: { color: '#71717a', textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: { backgroundColor: '#18181b', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#27272a', marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sender: { color: '#a1a1aa', fontWeight: 'bold', fontSize: 12 },
  priorityBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  priorityCritical: { backgroundColor: '#7f1d1d' },
  priorityHigh: { backgroundColor: '#7c2d12' },
  priorityMedium: { backgroundColor: '#713f12' },
  priorityLow: { backgroundColor: '#14532d' },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  messageText: { color: '#fff', fontSize: 14, marginVertical: 6, fontStyle: 'italic', lineHeight: 20 },
  meshPathContainer: { backgroundColor: '#09090b', padding: 8, borderRadius: 6, marginVertical: 8 },
  meshPathLabel: { color: '#71717a', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  meshPathRoute: { color: '#38bdf8', fontSize: 12, fontFamily: 'monospace' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: '#27272a', paddingTop: 8 },
  timestamp: { color: '#52525b', fontSize: 11 },
  resourceText: { color: '#71717a', fontSize: 12 },
  resourceVal: { color: '#f43f5e', fontWeight: 'bold' }
});
