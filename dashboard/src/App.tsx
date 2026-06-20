import { useState, useEffect } from 'react';
import { Shield, Radio, Activity, AlertTriangle, CheckCircle, RefreshCw, Layers, Terminal } from 'lucide-react';

const BACKEND_URL = 'http://127.0.0.1:5000';

interface Emergency {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  priority: string;
  resourceNeeded: string;
  meshPath: string[];
}

interface Decision {
  id: string;
  messageHash: string;
  action: string;
  resource: string;
  priority: string;
  timestamp: number;
  txHash: string;
  isVerified: boolean;
  economics?: {
    utilityScore: number;
    scarcityCost: number;
    decision: string;
    originalResource: string;
  };
}

interface Resources {
  available: { [key: string]: number };
  allocated: { [key: string]: number };
}

export default function App() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [resources, setResources] = useState<Resources>({
    available: { AMBULANCE: 0, MEDICAL_KIT: 0, FOOD_PACKETS: 0, RESCUE_TEAMS: 0, SHELTER_SPACE: 0 },
    allocated: { AMBULANCE: 0, MEDICAL_KIT: 0, FOOD_PACKETS: 0, RESCUE_TEAMS: 0, SHELTER_SPACE: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "System initialized.",
    "Awaiting offline telemetry signals..."
  ]);

  const logMessage = (msg: string) => {
    setTerminalLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const syncData = async () => {
    setLoading(true);
    try {
      const resEmergencies = await fetch(`${BACKEND_URL}/api/emergencies`);
      if (resEmergencies.ok) {
        const data = await resEmergencies.json();
        setEmergencies(data);
      }

      const resDecisions = await fetch(`${BACKEND_URL}/api/decisions`);
      if (resDecisions.ok) {
        const data = await resDecisions.json();
        setDecisions(data);
      }

      const resResources = await fetch(`${BACKEND_URL}/api/resources`);
      if (resResources.ok) {
        const data = await resResources.json();
        setResources(data);
      }
    } catch (err: any) {
      logMessage(`Sync error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (id: string, messageHash: string) => {
    setVerifyingId(id);
    logMessage(`Querying Monad contract for proof validation...`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/verify/${id}`);
      if (!res.ok) throw new Error("Verification call failed");
      const data = await res.json();
      
      if (data.isValid) {
        logMessage(`SUCCESS: Decision for hash ${messageHash.slice(0, 10)}... confirmed on-chain.`);
      } else {
        logMessage(`WARNING: Integrity compromised for decision ${id}! Hash mismatch.`);
      }
      syncData();
    } catch (err: any) {
      logMessage(`Verification check failed: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleTamper = async (id: string, messageHash: string) => {
    logMessage(`Simulating unauthorized database modification on decision ${id}...`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/verify/tamper/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error("Tamper trigger failed");
      logMessage(`Local DB values mutated for ${messageHash.slice(0, 10)}... Action modified.`);
      syncData();
    } catch (err: any) {
      logMessage(`Tamper simulation failed: ${err.message}`);
    }
  };

  const handleResetResources = async () => {
    logMessage("Replenishing coordinate supply inventories...");
    try {
      const res = await fetch(`${BACKEND_URL}/api/resources/reset`, { method: 'POST' });
      if (res.ok) {
        logMessage("Resources successfully replenished.");
        syncData();
      }
    } catch (err: any) {
      logMessage(`Reset error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-zinc-100 flex flex-col font-sans">
      {/* Top Banner Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-50 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-600 flex items-center justify-center glow-rose">
            <Layers className="text-white w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-rose-500">GHOSTNET AI</h1>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Monad Emergency Coordination Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={syncData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold transition duration-200"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            SYNC LEDGER
          </button>
          <button 
            onClick={handleResetResources}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-emerald-950 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 text-xs font-bold transition duration-200"
          >
            REPLENISH SUPPLY
          </button>
          <div className="flex items-center gap-2 text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 px-3 py-1.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            MONAD TESTNET: RUNNING
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Supply Gauge Metrics */}
          <section className="glass-panel rounded-xl p-5 glow-pink flex flex-col">
            <h2 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Economic Resource Allocations
            </h2>
            <div className="grid grid-cols-2 gap-3.5">
              {Object.keys(resources.available).map((resKey) => {
                const avail = resources.available[resKey];
                const alloc = resources.allocated[resKey] || 0;
                const total = avail + alloc;
                const percentage = total > 0 ? (avail / total) * 100 : 0;
                
                return (
                  <div key={resKey} className="bg-zinc-950/60 border border-zinc-900 rounded-lg p-3">
                    <p className="text-[9px] text-zinc-500 font-bold uppercase truncate">{resKey.replace("_", " ")}</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-black text-white">{avail}</span>
                      <span className="text-[10px] text-zinc-500">/ {total} Units</span>
                    </div>
                    {/* Progress Slider */}
                    <div className="w-full bg-zinc-900 rounded-full h-1 mt-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          percentage > 50 ? 'bg-emerald-500' : percentage > 15 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Simulated Node Path Graph */}
          <section className="glass-panel rounded-xl p-5 flex flex-col flex-1">
            <h2 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider mb-4 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Bluetooth Mesh Routing Topology
            </h2>
            <div className="flex-1 bg-zinc-950/40 rounded-lg border border-zinc-900 flex flex-col items-center justify-center p-4 relative min-h-[220px]">
              
              <div className="flex items-center justify-center relative w-full gap-2 md:gap-4">
                {['A', 'B', 'C', 'D'].map((n) => {
                  const isActive = selectedPath.includes(n);
                  return (
                    <div key={n} className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center border font-bold text-xs transition-all duration-300 ${
                        isActive 
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 glow-blue scale-110' 
                          : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                      }`}>
                        <span>{n}</span>
                        {n === 'D' && <span className="text-[6px] text-zinc-500 uppercase mt-[-3px]">GW</span>}
                      </div>
                      {n !== 'D' && (
                        <div className={`h-0.5 w-4 bg-zinc-800 transition-colors duration-300 ${
                          isActive && selectedPath.includes(String.fromCharCode(n.charCodeAt(0) + 1)) ? 'bg-cyan-400' : ''
                        }`}></div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 text-center text-[11px] text-zinc-500">
                <p className="font-semibold">Node A ➔ Node B ➔ Node C ➔ Node D (Gateway Node)</p>
                <p className="text-[9px] text-zinc-600 mt-1.5 italic">Click an emergency record below to visualize its mesh path traversal</p>
              </div>
            </div>
          </section>

          {/* System Console Output logs */}
          <section className="glass-panel rounded-xl p-4 bg-zinc-950/95 h-[160px] flex flex-col overflow-hidden border border-zinc-800">
            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-[10px] uppercase font-bold pb-2 border-b border-zinc-900">
              <Terminal className="w-3 h-3 text-zinc-500" />
              Agent Telemetry Logs
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[9px] text-zinc-400 space-y-1 scrollbar-thin">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="truncate">{log}</div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Columns */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Signals Table */}
          <section className="glass-panel rounded-xl p-5 flex flex-col max-h-[350px] overflow-hidden">
            <h2 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider mb-4 flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-500" />
              Incoming Emergency Transmissions
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {emergencies.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic py-10">
                  No signals detected. Broadcast a request using the mobile client simulator.
                </div>
              ) : (
                emergencies.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedPath(item.meshPath || [])}
                    className={`p-3 rounded-lg border transition cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                      selectedPath === item.meshPath 
                        ? 'border-cyan-500 bg-cyan-950/10' 
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-extrabold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">Node {item.sender}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.priority === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border border-red-900/30 animate-pulse' :
                          item.priority === 'HIGH' ? 'bg-amber-950/50 text-amber-400 border border-amber-900/30' :
                          item.priority === 'MEDIUM' ? 'bg-yellow-950/50 text-yellow-400 border border-yellow-900/30' :
                          'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'
                        }`}>
                          {item.priority || 'PENDING'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white italic">"{item.text}"</p>
                      {item.meshPath && (
                        <p className="text-[9px] font-mono text-zinc-500">Routing Hops: {item.meshPath.join(" ➔ ")}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-start md:items-end justify-between border-t md:border-t-0 border-zinc-800 pt-2 md:pt-0">
                      <span className="text-[9px] text-zinc-500 uppercase font-semibold">Priority Resource</span>
                      <span className="text-xs font-black text-rose-400 uppercase tracking-wide">{item.resourceNeeded || 'Calculating...'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Audit Ledger */}
          <section className="glass-panel rounded-xl p-5 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Immutable Auditing Ledger (Monad Blockchain)
            </h2>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px] pb-2">
                    <th className="py-2.5 px-3">Message Hash (Keccak256)</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Allocated Resource</th>
                    <th className="py-2.5 px-3">Economic Evaluation</th>
                    <th className="py-2.5 px-3">Dispatch Instruction</th>
                    <th className="py-2.5 px-3">On-Chain Proof Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-medium">
                  {decisions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-zinc-500 italic py-10">
                        No transactions registered on ledger. Create alerts from the simulator.
                      </td>
                    </tr>
                  ) : (
                    decisions.map((d) => (
                      <tr key={d.id} className="hover:bg-zinc-900/35 transition-colors">
                        <td className="py-3 px-3 font-mono text-[10px] text-rose-400">
                          <div className="max-w-[120px] truncate" title={d.messageHash}>
                            {d.messageHash}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            d.priority === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-900/30' :
                            d.priority === 'HIGH' ? 'bg-amber-950 text-amber-400 border border-amber-900/30' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {d.priority}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-zinc-300">
                          {d.resource}
                        </td>
                        <td className="py-3 px-3 text-left">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              Payoff: <span className="text-emerald-400">{d.economics?.utilityScore || 0}</span>
                            </span>
                            <span className="text-[10px] text-zinc-500 font-semibold">
                              Cost: <span className="text-amber-500">{d.economics?.scarcityCost ? Number(d.economics.scarcityCost).toFixed(1) : "0.0"}</span>
                            </span>
                            <span className="text-[8px] tracking-wider text-cyan-400 uppercase font-black mt-0.5">
                              {d.economics?.decision || "APPROVED"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-zinc-400 max-w-[140px] truncate" title={d.action}>
                          {d.action}
                        </td>
                        <td className="py-3 px-3">
                          {d.isVerified ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[9px]">
                              <CheckCircle className="w-3.5 h-3.5" />
                              VERIFIED IMMUTABLE
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-rose-500 font-extrabold text-[9px] animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              INTEGRITY COMPROMISED
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerify(d.id, d.messageHash)}
                              disabled={verifyingId === d.id}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 hover:text-white transition font-bold text-[9px]"
                            >
                              {verifyingId === d.id ? "Syncing..." : "Verify"}
                            </button>
                            <button
                              onClick={() => handleTamper(d.id, d.messageHash)}
                              className="px-2 py-1 rounded border border-rose-950 bg-rose-950/20 hover:bg-rose-950/60 text-rose-400 hover:text-zinc-100 transition font-bold text-[9px]"
                            >
                              Tamper
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>

      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950/40 px-6 py-2.5 flex justify-between items-center text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
        <span>GhostNet Protocol v1.0.0</span>
        <span>Secure Monad Testnet Uplink</span>
      </footer>
    </div>
  );
}
