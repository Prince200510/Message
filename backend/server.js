const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { ethers } = require("ethers");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const {
  connectDb,
  saveEmergency,
  updateEmergencyStatus,
  getEmergency,
  getAllEmergencies,
  saveDecision,
  getDecision,
  updateDecision,
  getAllDecisions
} = require("./db");

const {
  initBlockchain,
  storeDecisionOnChain,
  verifyDecisionOnChain,
  isMockMode
} = require("./blockchainHelper");

const app = express();
const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

app.use(cors());
app.use(express.json());

// Fallback classifier in JS if Python is not online
const localClassifier = (text) => {
  const text_lower = text.toLowerCase();
  let category = "MEDICAL";
  let priority = "MEDIUM";
  let resourceNeeded = "MEDICAL_KIT";
  let reason = "Classified by local Node.js rules engine.";

  if (text_lower.includes("bleed") || text_lower.includes("injured") || text_lower.includes("doctor") || text_lower.includes("hurt") || text_lower.includes("medical")) {
    category = "MEDICAL";
    if (text_lower.includes("badly") || text_lower.includes("heavy") || text_lower.includes("severe") || text_lower.includes("bleeding badly")) {
      priority = "CRITICAL";
      resourceNeeded = "AMBULANCE";
      reason = "Severe bleeding or critical trauma detected by local engine.";
    } else {
      priority = "HIGH";
      resourceNeeded = "AMBULANCE";
      reason = "Injury detected by local rules engine.";
    }
  } else if (text_lower.includes("food") || text_lower.includes("water") || text_lower.includes("hungry") || text_lower.includes("starve") || text_lower.includes("starving")) {
    category = "FOOD";
    priority = text_lower.includes("small") ? "LOW" : "MEDIUM";
    resourceNeeded = "FOOD_PACKETS";
    reason = "Food/water request classified by local rules engine.";
  } else if (text_lower.includes("shelter") || text_lower.includes("storm") || text_lower.includes("cold") || text_lower.includes("freezing")) {
    category = "SHELTER";
    priority = text_lower.includes("freezing") ? "HIGH" : "MEDIUM";
    resourceNeeded = "SHELTER_SPACE";
    reason = "Shelter request classified by local rules engine.";
  } else if (text_lower.includes("lost") || text_lower.includes("missing") || text_lower.includes("child") || text_lower.includes("find") || text_lower.includes("trapped")) {
    category = "MISSING_PERSON";
    priority = text_lower.includes("trapped") ? "CRITICAL" : "MEDIUM";
    resourceNeeded = "RESCUE_TEAMS";
    reason = "Missing person or trapped individual alert.";
  } else if (text_lower.includes("fire") || text_lower.includes("smoke") || text_lower.includes("flood") || text_lower.includes("danger") || text_lower.includes("looting")) {
    category = "SAFETY";
    priority = "CRITICAL";
    resourceNeeded = "RESCUE_TEAMS";
    reason = "Immediate safety threat detected by local rules engine.";
  }

  return { category, priority, resourceNeeded, reason };
};

// Start DB & Blockchain
connectDb().then(() => {
  initBlockchain();
});

// GET /api/emergencies
app.get("/api/emergencies", async (req, res) => {
  try {
    const list = await getAllEmergencies();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/decisions
app.get("/api/decisions", async (req, res) => {
  try {
    const list = await getAllDecisions();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/resources
app.get("/api/resources", async (req, res) => {
  try {
    // Try to get from Python AI agent, fallback to local pool if offline
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/agent/resources`);
      res.json(response.data);
    } catch (e) {
      res.json({
        available: { AMBULANCE: 2, MEDICAL_KIT: 5, FOOD_PACKETS: 100, RESCUE_TEAMS: 3, SHELTER_SPACE: 10 },
        allocated: { AMBULANCE: 0, MEDICAL_KIT: 0, FOOD_PACKETS: 0, RESCUE_TEAMS: 0, SHELTER_SPACE: 0 }
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/resources/reset
app.post("/api/resources/reset", async (req, res) => {
  try {
    try {
      await axios.post(`${AI_SERVICE_URL}/agent/resources/reset`);
    } catch (e) {
      // Local ignore
    }
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/emergency
app.post("/api/emergency", async (req, res) => {
  const { text, sender, meshPath } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const id = uuidv4();
    const timestamp = Date.now();
    
    // Save initial emergency record (unprocessed)
    const initialEmergency = {
      id,
      text,
      sender: sender || "Anonymous",
      timestamp,
      status: "PENDING",
      meshPath: meshPath || ["Local"]
    };
    
    await saveEmergency(initialEmergency);

    // 1. AI Analysis & Priority assessment
    let analysis;
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/agent/analyze`, { text });
      analysis = response.data;
    } catch (err) {
      console.warn("Python AI Service not responding. Using local Node.js classifier fallback.");
      analysis = localClassifier(text);
    }

    // Update emergency with category/priority/resource
    await updateEmergencyStatus(id, {
      category: analysis.category,
      priority: analysis.priority,
      resourceNeeded: analysis.resourceNeeded,
      status: "ANALYZED"
    });

    // 2. Resource Allocation
    let allocation;
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/agent/allocate`, {
        category: analysis.category,
        priority: analysis.priority,
        resourceNeeded: analysis.resourceNeeded,
        text
      });
      allocation = response.data;
    } catch (err) {
      console.warn("Python AI Service resource allocator not responding. Using local allocation logic.");
      const isAllocated = ["AMBULANCE", "MEDICAL_KIT", "RESCUE_TEAMS", "SHELTER_SPACE", "FOOD_PACKETS"].includes(analysis.resourceNeeded);
      allocation = {
        allocated: isAllocated,
        resource: isAllocated ? `${analysis.resourceNeeded} #1` : "None (Queued)",
        action: isAllocated ? `Dispatched ${analysis.resourceNeeded} #1` : `Queue for ${analysis.resourceNeeded}`,
        reason: "Allocated via local fallback rules engine."
      };
    }

    // 3. Generate Keccak256 hash of the emergency message
    const messageHash = ethers.solidityPackedKeccak256(["string"], [text]);

    // 4. Store Proof on Blockchain (Monad / Hardhat)
    const onChainRecord = await storeDecisionOnChain(
      messageHash,
      allocation.action,
      allocation.resource,
      analysis.priority
    );

    // Save final decision record in db
    const finalDecision = {
      id,
      messageHash,
      action: allocation.action,
      resource: allocation.resource,
      priority: analysis.priority,
      timestamp: onChainRecord.timestamp,
      txHash: onChainRecord.txHash,
      isVerified: true,
      economics: allocation.economics || {
        utilityScore: analysis.priority === "CRITICAL" ? 100 : analysis.priority === "HIGH" ? 75 : analysis.priority === "MEDIUM" ? 45 : 15,
        scarcityCost: 40.0,
        decision: "APPROVED",
        originalResource: analysis.resourceNeeded
      }
    };
    await saveDecision(finalDecision);

    // Update emergency status to complete/allocated
    const updatedEmergency = await updateEmergencyStatus(id, {
      status: "ALLOCATED"
    });

    res.json({
      emergency: updatedEmergency,
      decision: finalDecision,
      isMockChain: isMockMode()
    });

  } catch (error) {
    console.error("Error creating emergency request:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/decision/:id
app.get("/api/decision/:id", async (req, res) => {
  try {
    const decision = await getDecision(req.params.id);
    if (!decision) {
      return res.status(404).json({ error: "Decision not found" });
    }
    res.json(decision);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/verify/tamper/:id
// Helper to modify local database decision data to test tampered validation
app.post("/api/verify/tamper/:id", async (req, res) => {
  try {
    const decision = await getDecision(req.params.id);
    if (!decision) {
      return res.status(404).json({ error: "Decision not found" });
    }
    
    // Mutate the local decision action and resource to simulate database modification
    const tampered = await updateDecision(req.params.id, {
      action: "Dispatched MOCK_ITEM #99", // tampered action
      resource: "MOCK_ITEM", // tampered resource
      isVerified: false
    });
    
    res.json({ status: "Tampered", decision: tampered });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/verify/:id
app.get("/api/verify/:id", async (req, res) => {
  try {
    const decision = await getDecision(req.params.id);
    if (!decision) {
      return res.status(404).json({ error: "Decision not found" });
    }

    // Call smart contract to verify
    const isValid = await verifyDecisionOnChain(
      decision.messageHash,
      decision.action,
      decision.resource,
      decision.priority,
      decision.timestamp
    );

    // Update verified status in local db
    const updatedDecision = await updateDecision(req.params.id, { isVerified: isValid });

    res.json({
      id: decision.id,
      isValid,
      messageHash: decision.messageHash,
      txHash: decision.txHash,
      blockchainVerify: isValid,
      localRecord: updatedDecision
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
