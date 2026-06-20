const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GhostNetAgent", function () {
  let contract;

  beforeEach(async function () {
    const GhostNetAgent = await ethers.getContractFactory("GhostNetAgent");
    contract = await GhostNetAgent.deploy();
    await contract.waitForDeployment();
  });

  it("Should store and retrieve a decision", async function () {
    const msgHash = ethers.solidityPackedKeccak256(["string"], ["I need help"]);
    
    await contract.storeDecision(
      msgHash,
      "Send emergency rescue team",
      "RESCUE_TEAMS",
      "CRITICAL"
    );

    const decision = await contract.getDecision(msgHash);
    expect(decision.action).to.equal("Send emergency rescue team");
    expect(decision.resource).to.equal("RESCUE_TEAMS");
    expect(decision.priority).to.equal("CRITICAL");
    expect(decision.isInitialized).to.be.true;
  });

  it("Should verify a valid decision", async function () {
    const msgHash = ethers.solidityPackedKeccak256(["string"], ["I need food"]);
    
    await contract.storeDecision(
      msgHash,
      "Send food packets",
      "FOOD_PACKETS",
      "MEDIUM"
    );

    const decision = await contract.getDecision(msgHash);
    const isValid = await contract.verifyDecision(
      msgHash,
      "Send food packets",
      "FOOD_PACKETS",
      "MEDIUM",
      decision.timestamp
    );
    expect(isValid).to.be.true;
  });

  it("Should reject verification if data is tampered with", async function () {
    const msgHash = ethers.solidityPackedKeccak256(["string"], ["I need food"]);
    
    await contract.storeDecision(
      msgHash,
      "Send food packets",
      "FOOD_PACKETS",
      "MEDIUM"
    );

    const decision = await contract.getDecision(msgHash);
    
    // Check tampered resource
    let isValid = await contract.verifyDecision(
      msgHash,
      "Send food packets",
      "AMBULANCE", // tampered
      "MEDIUM",
      decision.timestamp
    );
    expect(isValid).to.be.false;

    // Check tampered priority
    isValid = await contract.verifyDecision(
      msgHash,
      "Send food packets",
      "FOOD_PACKETS",
      "HIGH", // tampered
      decision.timestamp
    );
    expect(isValid).to.be.false;
  });
});
