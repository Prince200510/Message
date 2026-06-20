const hre = require("hardhat");

async function main() {
  console.log("Starting deployment of GhostNetAgent...");

  // Compile if not compiled
  await hre.run("compile");

  const GhostNetAgent = await hre.ethers.getContractFactory("GhostNetAgent");
  const contract = await GhostNetAgent.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`GhostNetAgent deployed successfully to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
