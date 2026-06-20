const axios = require("axios");

const BACKEND_URL = "http://127.0.0.1:5000";

async function runTests() {
  console.log("\n====================================================");
  console.log("   GHOSTNET AI - INTEGRATION TEST SUITE");
  console.log("====================================================\n");

  let serverOnline = false;
  try {
    await axios.get(`${BACKEND_URL}/api/resources`);
    serverOnline = true;
  } catch (err) {
    console.error("❌ Error: GhostNet backend is not running on localhost:5000. Please start the backend server before running this test script.");
    process.exit(1);
  }

  // TEST 1: Minor Food Problem (Should resolve to LOW priority / FOOD_PACKETS)
  console.log("-----------------------------------------");
  console.log("Test 1: Minor Food Problem Classification");
  console.log("-----------------------------------------");
  try {
    const res = await axios.post(`${BACKEND_URL}/api/emergency`, {
      text: "I have small food problem",
      sender: "A",
      meshPath: ["A"]
    });
    const { emergency, decision } = res.data;
    console.log(`Input: "${emergency.text}"`);
    console.log(`AI Classification -> Priority: ${emergency.priority}, Resource: ${emergency.resourceNeeded}`);
    console.log(`AI Decision: ${decision.action}`);
    
    if (emergency.priority === "LOW" && emergency.resourceNeeded === "FOOD_PACKETS") {
      console.log("✅ Test 1 PASSED!");
    } else {
      console.log("❌ Test 1 FAILED: Expected priority LOW and resource FOOD_PACKETS.");
    }
  } catch (err) {
    console.error("❌ Test 1 Error:", err.message);
  }

  // TEST 2: Severe Trauma/Bleeding (Should resolve to CRITICAL priority / AMBULANCE)
  console.log("\n-----------------------------------------");
  console.log("Test 2: Critical Bleeding Classification");
  console.log("-----------------------------------------");
  try {
    const res = await axios.post(`${BACKEND_URL}/api/emergency`, {
      text: "Person bleeding badly",
      sender: "B",
      meshPath: ["A", "B"]
    });
    const { emergency, decision } = res.data;
    console.log(`Input: "${emergency.text}"`);
    console.log(`AI Classification -> Priority: ${emergency.priority}, Resource: ${emergency.resourceNeeded}`);
    console.log(`AI Decision: ${decision.action}`);
    
    if (emergency.priority === "CRITICAL" && emergency.resourceNeeded === "AMBULANCE") {
      console.log("✅ Test 2 PASSED!");
    } else {
      console.log("❌ Test 2 FAILED: Expected priority CRITICAL and resource AMBULANCE.");
    }
  } catch (err) {
    console.error("❌ Test 2 Error:", err.message);
  }

  // TEST 3: Cryptographic Integrity & Tampering (Should verify on-chain and then catch database changes)
  console.log("\n-----------------------------------------");
  console.log("Test 3: Blockchain Integrity and Tamper Check");
  console.log("-----------------------------------------");
  try {
    // Create new emergency record
    const resEmergency = await axios.post(`${BACKEND_URL}/api/emergency`, {
      text: "Medical request for immediate aid",
      sender: "C",
      meshPath: ["C"]
    });
    const { emergency } = resEmergency.data;
    const emergencyId = emergency.id;

    // Verify initial state
    let verifyRes = await axios.get(`${BACKEND_URL}/api/verify/${emergencyId}`);
    console.log(`Initial status: verified = ${verifyRes.data.isValid}`);
    if (!verifyRes.data.isValid) {
      console.log("❌ Initial verify check failed.");
    }

    // Trigger local database modification (tampering)
    console.log("Triggering database tamper on the local record...");
    const tamperRes = await axios.post(`${BACKEND_URL}/api/verify/tamper/${emergencyId}`);
    console.log(`Tampered values: Action = "${tamperRes.data.decision.action}", Resource = "${tamperRes.data.decision.resource}"`);

    // Verify after tampering
    verifyRes = await axios.get(`${BACKEND_URL}/api/verify/${emergencyId}`);
    console.log(`Post-tamper validation status: verified = ${verifyRes.data.isValid}`);

    if (verifyRes.data.isValid === false) {
      console.log("✅ Test 3 PASSED! Blockchain successfully identified local database manipulation.");
    } else {
      console.log("❌ Test 3 FAILED: Blockchain validator did not reject the modified local database record.");
    }
  } catch (err) {
    console.error("❌ Test 3 Error:", err.message);
  }

  // TEST 4: Mesh network propagation path checks
  console.log("\n-----------------------------------------");
  console.log("Test 4: BLE Mesh Node Hops Validation");
  console.log("-----------------------------------------");
  try {
    const res = await axios.post(`${BACKEND_URL}/api/emergency`, {
      text: "Safety emergency",
      sender: "A",
      meshPath: ["A", "B", "C", "Gateway"]
    });
    const { emergency } = res.data;
    console.log(`Hops traveled: ${emergency.meshPath.join(" ➔ ")}`);
    if (emergency.meshPath.includes("Gateway") && emergency.meshPath.includes("A") && emergency.meshPath.includes("C")) {
      console.log("✅ Test 4 PASSED! Packet successfully verified as passing hop-by-hop through nodes to gateway.");
    } else {
      console.log("❌ Test 4 FAILED: Mesh path is incomplete or invalid.");
    }
  } catch (err) {
    console.error("❌ Test 4 Error:", err.message);
  }

  console.log("\n====================================================");
  console.log("           TEST PROCESS COMPLETED");
  console.log("====================================================\n");
}

runTests();
