import { ethers } from "ethers";

export const GHOSTNET_CONTRACT_ABI = [
  "function storeDecision(bytes32 messageHash, string memory action, string memory resource, string memory priority) public",
  "function verifyDecision(bytes32 messageHash, string memory action, string memory resource, string memory priority, uint256 timestamp) public view returns (bool)",
  "function getDecision(bytes32 messageHash) public view returns (tuple(bytes32 messageHash, string action, string resource, string priority, uint256 timestamp, bool isInitialized))"
];

/**
 * Calculates a Solidity-compatible Keccak256 hash of the emergency text.
 */
export function calculateMessageHash(text: string): string {
  return ethers.solidityPackedKeccak256(["string"], [text]);
}

/**
 * Contacts the Express backend verification API to check on-chain proof for a decision.
 */
export async function verifyDecision(
  backendUrl: string,
  emergencyId: string
): Promise<{ isValid: boolean; messageHash: string; txHash: string }> {
  try {
    const res = await fetch(`${backendUrl}/api/verify/${emergencyId}`);
    if (!res.ok) {
      throw new Error("Verification network request failed");
    }
    const data = await res.json();
    return {
      isValid: data.isValid,
      messageHash: data.messageHash,
      txHash: data.txHash
    };
  } catch (error) {
    console.error("Mobile blockchain verification helper error:", error);
    return { isValid: false, messageHash: "", txHash: "" };
  }
}
