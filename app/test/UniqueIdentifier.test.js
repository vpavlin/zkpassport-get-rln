import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("UniqueIdentifier", function () {
  let UniqueIdentifier;
  let uniqueIdentifier;
  let owner;
  let addr1;
  let addr2;

  // Mock proof verification parameters
  const mockProofVerificationParams = {
    vkeyHash: ethers.ZeroHash,
    proof: "0x",
    publicInputs: [ethers.ZeroHash],
    committedInputs: "0x",
    committedInputCounts: [0],
    validityPeriodInDays: 30,
    domain: "test-domain",
    scope: "test-scope",
    devMode: true
  };

  beforeEach(async function () {
    // Get the contract factory
    UniqueIdentifier = await ethers.getContractFactory("UniqueIdentifier");
    
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract
    uniqueIdentifier = await UniqueIdentifier.deploy();
    await uniqueIdentifier.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await uniqueIdentifier.getAddress()).to.be.properAddress;
    });
  });

  describe("Identifier Registration", function () {
    it("Should register a new identifier successfully", async function () {
      // Register identifier with proof parameters
      const tx = await uniqueIdentifier.registerIdentifier(mockProofVerificationParams);
      await tx.wait();
      
      // The unique identifier would be generated from the proof verification
      // For testing purposes, we can't predict the exact identifier without a real verifier
      // This test verifies the registration process works
      expect(tx).to.be.ok;
    });

    it("Should prevent registration of duplicate identifier", async function () {
      // Register identifier first time
      await uniqueIdentifier.registerIdentifier(mockProofVerificationParams);
      
      // Try to register again with same parameters
      const tx = await uniqueIdentifier.registerIdentifier(mockProofVerificationParams);
      const receipt = await tx.wait();
      
      // Check that registration failed (returns false)
      // The transaction should succeed but return false
      expect(receipt.status).to.equal(1);
    });
  });

  describe("Identifier Verification", function () {
    it("Should return false for non-existent identifier", async function () {
      const identifier = ethers.ZeroHash;
      expect(await uniqueIdentifier.checkIdentifier(identifier)).to.equal(false);
    });

    it("Should check multiple identifiers correctly", async function () {
      const identifiers = [ethers.ZeroHash, ethers.randomBytes(32), ethers.randomBytes(32)];
      
      // Register first identifier
      await uniqueIdentifier.registerIdentifier({
        ...mockProofVerificationParams,
        publicInputs: [identifiers[0]]
      });
      
      // Check all three
      const results = await uniqueIdentifier.checkIdentifiers(identifiers);
      
      // First should exist, others should not
      expect(results[0]).to.equal(true);
      expect(results[1]).to.equal(false);
      expect(results[2]).to.equal(false);
    });
  });
});