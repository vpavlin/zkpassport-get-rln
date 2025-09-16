import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  // Get contract addresses from command line arguments or use default zero addresses for testing
  const zkPassportVerifierAddress = process.argv[2] || "0xBec82dec0747C9170D760D5aba9cc44929B17C05";
  const rlnAddress = process.argv[3] || "0xc9dbf0dffd0921722a0c431749a748c0a4de3741";

  console.log("Deploying with dependencies:");
  console.log("ZKPassportVerifier:", zkPassportVerifierAddress);
  console.log("RLN:", rlnAddress);

  // Get the contract factory
  const UniqueIdentifier = await ethers.getContractFactory("UniqueIdentifier");
  
  // Deploy the contract with dependencies
  const uniqueIdentifier = await UniqueIdentifier.deploy(
    zkPassportVerifierAddress,
    rlnAddress
  );
  
  // Wait for deployment to complete
  await uniqueIdentifier.waitForDeployment();
  
  // Get the contract address
  const address = await uniqueIdentifier.getAddress();
  console.log(`UniqueIdentifier contract deployed to ${address}`);


  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 sec delay

  // 3. AUTO-VERIFY (handles all networks including Base)
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [zkPassportVerifierAddress, rlnAddress], // MUST match deploy args
      contract: "contracts/UniqueIdentifier.sol:UniqueIdentifier", // Full path
    });
    console.log("✅ Verified successfully!");
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("⚠️ Already verified (safe to ignore)");
    } else {
      console.error("VERIFICATION FAILED:", e);
      // Optional: Retry after 60 sec if explorer lag
      // await new Promise(resolve => setTimeout(resolve, 60000));
      // ...retry logic here
    }
  }
  
}

// Handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});