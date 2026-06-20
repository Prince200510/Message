const { ethers } = require("ethers");

const CONTRACT_ABI = [
  "function storeDecision(bytes32 messageHash, string memory action, string memory resource, string memory priority) public",
  "function verifyDecision(bytes32 messageHash, string memory action, string memory resource, string memory priority, uint256 timestamp) public view returns (bool)",
  "function getDecision(bytes32 messageHash) public view returns (tuple(bytes32 messageHash, string action, string resource, string priority, uint256 timestamp, bool isInitialized))"
];

let provider;
let wallet;
let contract;
let isMock = false;

// Simulated storage when RPC or keys are not provided
const mockChain = {};

function initBlockchain() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!privateKey || !contractAddress) {
    console.log("Missing PRIVATE_KEY or CONTRACT_ADDRESS in backend configuration. Running blockchain in SIMULATED (Mock) mode.");
    isMock = true;
    return;
  }

  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    wallet = new ethers.Wallet(privateKey, provider);
    contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
    console.log(`Blockchain integration loaded successfully at address: ${contractAddress}`);
  } catch (err) {
    console.warn("Could not connect to Ethers RPC. Falling back to local Mock Blockchain simulation:", err.message);
    isMock = true;
  }
}

async function storeDecisionOnChain(messageHash, action, resource, priority) {
  if (isMock) {
    const timestamp = Math.floor(Date.now() / 1000);
    const mockTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join("");
    
    mockChain[messageHash] = {
      messageHash,
      action,
      resource,
      priority,
      timestamp,
      isInitialized: true
    };
    
    console.log(`[BLOCKCHAIN SIMULATOR] Stored Decision on-chain. TxHash: ${mockTxHash}`);
    return { txHash: mockTxHash, timestamp };
  }

  try {
    const tx = await contract.storeDecision(messageHash, action, resource, priority);
    const receipt = await tx.wait();
    
    // Retrieve timestamp of the block containing the TX
    const block = await provider.getBlock(receipt.blockNumber);
    const timestamp = block.timestamp;
    
    console.log(`[REAL ON-CHAIN] Stored Decision. TxHash: ${receipt.hash}`);
    return { txHash: receipt.hash, timestamp };
  } catch (error) {
    console.error("Failed to commit on-chain, falling back to mock blockchain registry:", error.message);
    const timestamp = Math.floor(Date.now() / 1000);
    const mockTx = "0xmock" + Math.random().toString(36).substring(2, 12);
    mockChain[messageHash] = { messageHash, action, resource, priority, timestamp, isInitialized: true };
    return { txHash: mockTx, timestamp };
  }
}

async function verifyDecisionOnChain(messageHash, action, resource, priority, timestamp) {
  if (isMock || mockChain[messageHash]) {
    const d = mockChain[messageHash];
    if (!d) {
      console.log(`[BLOCKCHAIN SIMULATOR] Hash ${messageHash} not found in registry.`);
      return false;
    }
    
    const isValid = (
      d.action === action &&
      d.resource === resource &&
      d.priority === priority &&
      Number(d.timestamp) === Number(timestamp)
    );
    console.log(`[BLOCKCHAIN SIMULATOR] Verification checked locally: ${isValid}`);
    return isValid;
  }

  try {
    const isValid = await contract.verifyDecision(messageHash, action, resource, priority, timestamp);
    console.log(`[REAL ON-CHAIN] Verification checked: ${isValid}`);
    return isValid;
  } catch (error) {
    console.error("Error performing on-chain validation; checking fallback records:", error.message);
    return false;
  }
}

module.exports = {
  initBlockchain,
  storeDecisionOnChain,
  verifyDecisionOnChain,
  isMockMode: () => isMock
};
