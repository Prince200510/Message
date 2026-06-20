import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import EmergencyCreate from './screens/EmergencyCreate';
import EmergencyFeed from './screens/EmergencyFeed';
import AgentDecision from './screens/AgentDecision';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'create' | 'feed' | 'decisions'>('create');
  
  // Local server backend URL config
  // - localhost / 127.0.0.1 works for Web or iOS Simulators
  // - Use 10.0.2.2 if testing from an Android emulator (which routes to computer localhost)
  const backendUrl = 'http://127.0.0.1:5000'; 

  const renderContent = () => {
    switch (currentTab) {
      case 'create':
        return <EmergencyCreate backendUrl={backendUrl} />;
      case 'feed':
        return <EmergencyFeed backendUrl={backendUrl} />;
      case 'decisions':
        return <AgentDecision backendUrl={backendUrl} />;
      default:
        return <EmergencyCreate backendUrl={backendUrl} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      
      {/* Target Content Area */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Tabs Menu Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, currentTab === 'create' && styles.tabActive]} 
          onPress={() => setCurrentTab('create')}
        >
          <Text style={[styles.tabText, currentTab === 'create' && styles.tabTextActive]}>🚨 Alert</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentTab === 'feed' && styles.tabActive]} 
          onPress={() => setCurrentTab('feed')}
        >
          <Text style={[styles.tabText, currentTab === 'feed' && styles.tabTextActive]}>📡 Signals</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentTab === 'decisions' && styles.tabActive]} 
          onPress={() => setCurrentTab('decisions')}
        >
          <Text style={[styles.tabText, currentTab === 'decisions' && styles.tabTextActive]}>🛡️ Ledger</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: '#f43f5e',
  },
  tabText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#f43f5e',
  },
});
