import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { verifyDecision } from '../blockchain/contract';

export default function AgentDecision({ backendUrl = 'http://127.0.0.1:5000' }: { backendUrl?: string }) {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/decisions`);
      if (!response.ok) {
        throw new Error("Failed to fetch decisions");
      }
      const data = await response.json();
      setDecisions(data);
    } catch (error) {
      console.error("Error fetching decisions for mobile feed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const result = await verifyDecision(backendUrl, id);
      if (result.isValid) {
        Alert.alert(
          "Verification Success ✅", 
          "The decision hash matches the recorded proof on the Monad blockchain network. Data integrity is active and verified."
        );
      } else {
        Alert.alert(
          "VERIFICATION FAILED ❌", 
          "Cryptographic hash mismatch! The local decision parameters do not match the on-chain immutable smart contract records."
        );
      }
      await fetchDecisions();
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleTamper = async (id: string) => {
    try {
      const response = await fetch(`${backendUrl}/api/verify/tamper/${id}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error("Tampering call failed");
      const data = await response.json();
      Alert.alert(
        "Local Record Tampered! ⚠️",
        `Simulated database modification: Changed action to "${data.decision.action}". Tap 'Verify On Chain' to see the blockchain validation fail.`
      );
      await fetchDecisions();
    } catch (error: any) {
      Alert.alert("Tamper failed", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BLOCKCHAIN VERIFY</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchDecisions} disabled={loading}>
          <Text style={styles.refreshBtnText}>SYNC</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#f43f5e" />
      ) : (
        <FlatList
          data={decisions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No emergency decisions committed to blockchain yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.hashLabel}>Message Keccak Hash:</Text>
                <Text style={styles.hashVal} numberOfLines={1}>{item.messageHash}</Text>
              </View>

              <View style={styles.details}>
                <Text style={styles.detailText}><Text style={styles.boldText}>Action:</Text> {item.action}</Text>
                <Text style={styles.detailText}><Text style={styles.boldText}>Resource:</Text> {item.resource}</Text>
                <Text style={styles.detailText}><Text style={styles.boldText}>Priority:</Text> {item.priority}</Text>
                {item.economics && (
                  <Text style={styles.detailText}>
                    <Text style={styles.boldText}>Economics:</Text> Payoff {item.economics.utilityScore} / Cost {item.economics.scarcityCost?.toFixed(1)} ({item.economics.decision})
                  </Text>
                )}
                <Text style={styles.detailText}><Text style={styles.boldText}>Block Time:</Text> {new Date(item.timestamp * 1000).toLocaleString()}</Text>
              </View>

              <View style={styles.txRow}>
                <Text style={styles.txLabel}>Monad Tx:</Text>
                <Text style={styles.txVal} numberOfLines={1}>{item.txHash}</Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Verification Status:</Text>
                {item.isVerified ? (
                  <View style={styles.badgeVerified}>
                    <Text style={styles.badgeText}>VERIFIED MATCH</Text>
                  </View>
                ) : (
                  <View style={styles.badgeUnverified}>
                    <Text style={styles.badgeText}>MISMATCH / FAILED</Text>
                  </View>
                )}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => handleVerify(item.id)}
                  disabled={verifyingId === item.id}
                >
                  {verifyingId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.verifyBtnText}>Verify On Chain</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tamperBtn}
                  onPress={() => handleTamper(item.id)}
                >
                  <Text style={styles.tamperBtnText}>Tamper Data</Text>
                </TouchableOpacity>
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
  cardHeader: { marginBottom: 8 },
  hashLabel: { color: '#71717a', fontSize: 11, fontWeight: 'bold' },
  hashVal: { color: '#f43f5e', fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
  details: { backgroundColor: '#09090b', padding: 10, borderRadius: 6, marginVertical: 8 },
  detailText: { color: '#e4e4e7', fontSize: 13, marginVertical: 2, lineHeight: 18 },
  boldText: { fontWeight: 'bold', color: '#a1a1aa' },
  txRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  txLabel: { color: '#71717a', fontSize: 12, marginRight: 6 },
  txVal: { color: '#38bdf8', fontSize: 12, fontFamily: 'monospace', flex: 1 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  statusLabel: { color: '#a1a1aa', fontSize: 13 },
  badgeVerified: { backgroundColor: '#14532d', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  badgeUnverified: { backgroundColor: '#991b1b', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  verifyBtn: { flex: 1, backgroundColor: '#f43f5e', padding: 10, borderRadius: 6, alignItems: 'center', marginRight: 6 },
  verifyBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  tamperBtn: { flex: 1, backgroundColor: '#27272a', padding: 10, borderRadius: 6, alignItems: 'center', marginLeft: 6, borderWidth: 1, borderColor: '#dc2626', borderStyle: 'dashed' },
  tamperBtnText: { color: '#ef4444', fontSize: 13, fontWeight: 'bold' }
});
