import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { initializeDefaultMesh, globalMeshRegistry, MeshMessage } from '../mesh/meshNetwork';

export default function EmergencyCreate({ backendUrl = 'http://127.0.0.1:5000' }: { backendUrl?: string }) {
  const [text, setText] = useState('');
  const [sender, setSender] = useState('A');
  const [isOffline, setIsOffline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [meshLogs, setMeshLogs] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);

  const handleSend = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setMeshLogs([]);
    setResult(null);

    // Set up standard node graph
    initializeDefaultMesh();

    if (isOffline) {
      const logs: string[] = [];
      logs.push(`[Mesh Core Activated] Initiating transmission from Node ${sender}.`);
      
      const startNode = globalMeshRegistry[sender];
      if (!startNode) {
        logs.push(`[Mesh Error] Node ${sender} is unreachable.`);
        setMeshLogs(logs);
        setLoading(false);
        return;
      }

      // Bind node callbacks to collect visual logs
      Object.keys(globalMeshRegistry).forEach((id) => {
        globalMeshRegistry[id].onReceiveCallback = (msg: MeshMessage, from: string) => {
          logs.push(`Node ${id} received broadcast from Node ${from}. Route: ${msg.path.join(" ➔ ")}`);
          setMeshLogs([...logs]);
        };
      });

      logs.push(`Node ${sender} broadcasting packet via BLE advertising channel...`);
      setMeshLogs([...logs]);

      // Dispatch packet through mesh network
      const msg = startNode.sendMessage(text);

      // Wait for the packet to traverse the network (B -> C -> D)
      setTimeout(async () => {
        logs.push(`Packet received by Gateway Node D. Satellite uplink active.`);
        logs.push(`Sending emergency payload to central GHOSTNET AI Agent...`);
        setMeshLogs([...logs]);

        try {
          const response = await fetch(`${backendUrl}/api/emergency`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: msg.text,
              sender: msg.sender,
              meshPath: [...msg.path, "Gateway"]
            })
          });

          if (!response.ok) {
            throw new Error("Central server gateway unreachable");
          }
          const data = await response.json();
          logs.push(`Verification payload registered. Decision locked in blockchain!`);
          setMeshLogs([...logs]);
          setResult(data);
        } catch (err: any) {
          logs.push(`Mesh Uplink Error: ${err.message}`);
          setMeshLogs([...logs]);
        } finally {
          setLoading(false);
        }
      }, 950);

    } else {
      // Direct cellular uplink simulation
      try {
        const response = await fetch(`${backendUrl}/api/emergency`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sender: `Direct Node ${sender}`, meshPath: ["Cellular Gateway"] })
        });
        if (!response.ok) throw new Error("Cellular connection failed");
        const data = await response.json();
        setResult(data);
      } catch (err: any) {
        setMeshLogs([`Failed to reach coordinate server: ${err.message}`]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>GHOSTNET AI</Text>
      <Text style={styles.subtitle}>Decentralized Emergency Dispatch</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Emergency Request Description</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe emergency (e.g., Person bleeding badly, unconscious)"
          placeholderTextColor="#71717a"
          value={text}
          onChangeText={setText}
          multiline
        />

        <Text style={styles.label}>Origin Node (Your Node)</Text>
        <View style={styles.row}>
          {['A', 'B', 'C'].map((node) => (
            <TouchableOpacity
              key={node}
              style={[styles.nodeBtn, sender === node && styles.nodeBtnActive]}
              onPress={() => setSender(node)}
            >
              <Text style={[styles.nodeBtnText, sender === node && styles.nodeBtnTextActive]}>Device {node}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.row, styles.toggleRow]}>
          <Text style={styles.label}>Bluetooth Offline Mesh Protocol</Text>
          <Switch
            value={isOffline}
            onValueChange={setIsOffline}
            trackColor={{ false: '#27272a', true: '#f43f5e' }}
            thumbColor={isOffline ? '#fff' : '#a1a1aa'}
          />
        </View>

        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Broadcast Alert</Text>}
        </TouchableOpacity>
      </View>

      {meshLogs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Offline Mesh Simulation Logs</Text>
          {meshLogs.map((log, index) => (
            <Text key={index} style={styles.logText}>➔ {log}</Text>
          ))}
        </View>
      )}

      {result && (
        <View style={styles.cardSuccess}>
          <Text style={styles.successTitle}>On-Chain Dispatch Complete</Text>
          <View style={styles.successDetails}>
            <Text style={styles.successText}><Text style={styles.boldText}>Category:</Text> {result.emergency.category}</Text>
            <Text style={styles.successText}><Text style={styles.boldText}>Priority:</Text> {result.decision.priority}</Text>
            <Text style={styles.successText}><Text style={styles.boldText}>Resource:</Text> {result.decision.resource}</Text>
            <Text style={styles.successText}><Text style={styles.boldText}>Action:</Text> {result.decision.action}</Text>
            <Text style={styles.successHash}><Text style={styles.boldText}>Tx Hash:</Text> {result.decision.txHash}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { padding: 20, paddingTop: 40 },
  title: { fontSize: 30, fontWeight: '900', color: '#f43f5e', textAlign: 'center', letterSpacing: 2 },
  subtitle: { fontSize: 12, color: '#71717a', textAlign: 'center', marginBottom: 25, fontWeight: '700', letterSpacing: 1 },
  card: { backgroundColor: '#18181b', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#27272a', marginBottom: 20 },
  cardSuccess: { backgroundColor: '#052e16', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#14532d', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#e4e4e7', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: '#09090b', borderRadius: 8, padding: 12, color: '#fff', fontSize: 15, height: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: '#27272a', marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  toggleRow: { alignItems: 'center', justifyContent: 'space-between', marginVertical: 5 },
  nodeBtn: { flex: 1, backgroundColor: '#27272a', padding: 12, marginHorizontal: 4, borderRadius: 8, alignItems: 'center' },
  nodeBtnActive: { backgroundColor: '#f43f5e' },
  nodeBtnText: { color: '#a1a1aa', fontWeight: 'bold', fontSize: 13 },
  nodeBtnTextActive: { color: '#fff' },
  sendBtn: { backgroundColor: '#f43f5e', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 5 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#a1a1aa', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#27272a', paddingBottom: 5 },
  logText: { color: '#38bdf8', fontSize: 12, fontFamily: 'monospace', marginVertical: 3 },
  successTitle: { fontSize: 16, fontWeight: 'bold', color: '#4ade80', marginBottom: 8 },
  successDetails: { marginTop: 4 },
  successText: { color: '#e4e4e7', fontSize: 14, marginVertical: 1.5 },
  successHash: { color: '#86efac', fontSize: 11, fontFamily: 'monospace', marginTop: 6 },
  boldText: { fontWeight: 'bold', color: '#fff' }
});
