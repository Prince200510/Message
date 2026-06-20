export interface MeshMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  path: string[]; // Traces route: e.g. ["A", "B", "C"]
}

export class MeshNode {
  id: string;
  neighbors: string[];
  messageHistory: Map<string, MeshMessage>;
  onReceiveCallback?: (msg: MeshMessage, from: string) => void;

  constructor(id: string, neighbors: string[] = []) {
    this.id = id;
    this.neighbors = neighbors;
    this.messageHistory = new Map();
  }

  addNeighbor(neighborId: string) {
    if (!this.neighbors.includes(neighborId)) {
      this.neighbors.push(neighborId);
    }
  }

  sendMessage(text: string): MeshMessage {
    const msg: MeshMessage = {
      id: `msg_${this.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      text,
      sender: this.id,
      timestamp: Date.now(),
      path: [this.id]
    };
    
    this.messageHistory.set(msg.id, msg);
    console.log(`[MeshNode ${this.id}] Created original message: "${text}"`);
    
    // Broadcast to immediate neighbors
    this.forwardMessage(msg);
    return msg;
  }

  receiveMessage(msg: MeshMessage, fromNeighborId: string) {
    // Avoid duplicate message forwarding loops
    if (this.messageHistory.has(msg.id)) {
      console.log(`[MeshNode ${this.id}] Duplicate packet ${msg.id} ignored.`);
      return;
    }

    const updatedMsg: MeshMessage = {
      ...msg,
      path: [...msg.path, this.id]
    };
    
    this.messageHistory.set(msg.id, updatedMsg);
    console.log(`[MeshNode ${this.id}] Received message from ${fromNeighborId}. Propagation Path: ${updatedMsg.path.join(" -> ")}`);
    
    if (this.onReceiveCallback) {
      this.onReceiveCallback(updatedMsg, fromNeighborId);
    }

    // Forward the packet
    this.forwardMessage(updatedMsg);
  }

  forwardMessage(msg: MeshMessage) {
    this.neighbors.forEach((neighborId) => {
      // Do not forward back to any node that has already processed this packet
      if (!msg.path.includes(neighborId)) {
        setTimeout(() => {
          const neighborNode = globalMeshRegistry[neighborId];
          if (neighborNode) {
            neighborNode.receiveMessage(msg, this.id);
          }
        }, 150); // Simulate network latency
      }
    });
  }
}

// Global lookup table of all nodes
export const globalMeshRegistry: { [id: string]: MeshNode } = {};

// Default setup: A <-> B <-> C <-> D
export function initializeDefaultMesh() {
  const ids = ["A", "B", "C", "D"];
  
  // Clean registry
  Object.keys(globalMeshRegistry).forEach((key) => {
    delete globalMeshRegistry[key];
  });
  
  // Instantiate nodes
  ids.forEach((id) => {
    globalMeshRegistry[id] = new MeshNode(id);
  });

  // Link A <-> B
  globalMeshRegistry["A"].addNeighbor("B");
  globalMeshRegistry["B"].addNeighbor("A");

  // Link B <-> C
  globalMeshRegistry["B"].addNeighbor("C");
  globalMeshRegistry["C"].addNeighbor("B");

  // Link C <-> D
  globalMeshRegistry["C"].addNeighbor("D");
  globalMeshRegistry["D"].addNeighbor("C");
  
  console.log("Mesh network nodes simulated: A <-> B <-> C <-> D");
}
