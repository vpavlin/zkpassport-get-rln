import { indexedDB, IDBFactory } from 'fake-indexeddb';
global.indexedDB = indexedDB;
global.IDBFactory = IDBFactory;

import { Buffer } from 'buffer';
global.Buffer = Buffer;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import { verifyOnChain } from './lib/onchain.js';
import getDispatcher, { Dispatcher } from 'waku-dispatcher';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mint token function
async function mintToken(recipient: string) {
  try {

    // 1. Configure provider (Infura/Alchemy/your node)
    const provider = new ethers.JsonRpcProvider(process.env.LINEA_RPC);
    
    // 2. Load your PRIVATE KEY (MUST have minting privileges)
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    
    // 3. Contract configuration
    const contractAddress = process.env.CONTRACT_ADDRESS!;
    const contractABI = [
      "function mint(address to, uint256 amount) external"
    ];
    
    // 4. Create contract instance
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    // 5. Execute mint (1 token = 1e18 units for 18-decimal tokens)
    const tx = await contract.mint(
      recipient, 
      process.env.AMOUNT // Adjust decimals if needed
    );
    
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait(); // Wait for confirmation
    console.log("Mint successful!");
    
    return { success: true, hash: tx.hash, receipt };
  } catch (error: any) {
    console.error("Mint failed:", error);
    return { success: false, error: error.message || 'Minting failed' };
  }
}

// REST API endpoint
app.post('/api/mint', async (req, res) => {
  try {
    const { recipient, amount } = req.body;
    
    // Validate input
    if (!recipient) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient address is required' 
      });
    }
    
    if (!ethers.isAddress(recipient)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient address' 
      });
    }
    
    const result = await mintToken(recipient);
    res.json(result);
  } catch (error:any) {
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Minting failed' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize Waku Dispatcher
let wakuDispatcher: Dispatcher | null;
(async () => {
  wakuDispatcher = await getDispatcher(
    undefined,
    process.env.WAKU_CONTENT_TOPIC_MINT || '/rln/1/mint/json',
    'zkpassport',
    true,
    true
  );

  if (!wakuDispatcher) {
    console.error("Failed to initialize Waku Dispatcher");
    return;
  }
  wakuDispatcher.on("register", async (payload) => {
    console.log("Received registration payload");

    console.log("Data", payload);

    // Then verify on chain using the shared transaction utility
    try {
      const verificationResult = await verifyOnChain(payload.verification.params, payload.idCommitment);
      console.log("Verification successful:", verificationResult);
      wakuDispatcher!.emit("register_response", {hash: verificationResult.hash, success: true}, undefined, undefined, true);

    } catch (error) {
      console.error("Verification failed:", error);
      // Don't fail the entire operation if verification fails
      wakuDispatcher!.emit("register_response", {error: (error as any).message || 'Verification failed', success: false}, undefined, undefined, true);

    }




  }, false, false, undefined, false);
  wakuDispatcher.setLogLevel(3)

  await wakuDispatcher.start();
})();

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/mint - Mint tokens');
  console.log('  GET  /health     - Health check');
  
});