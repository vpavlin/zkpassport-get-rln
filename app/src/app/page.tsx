"use client";

import { sepolia } from "viem/chains";
import { ProofResult, ZKPassport } from "@zkpassport/sdk";
import QRCode from "react-qr-code";
import { createWalletClient, custom } from "viem";
import { createPublicClient, http, parseAbi } from "viem";
import { useState, useEffect, useRef } from "react";
import { getInstance } from "@/lib/waku-dispatcher";
import { RLN_CONTRACT_ADDRESS, VERIFIER_CONTRACT_ADDRESS } from "@/lib/constants";
import { getVerifierParams, verifyOnChain } from "@/lib/onchain";
import WalletConnectButton from "@/components/WalletConnectButton";
import WalletDetails from "@/components/WalletDetails";
import { ethers } from "ethers";

export default function Home() {
  // Initialize WakuDispatcher
  useEffect(() => {
    const initWaku = async () => {
      try {
        const waku = await getInstance(setStatus);
        console.log("Waku dispatcher initialized with content topic:", waku);
      } catch (error) {
        console.error("Failed to initialize Waku dispatcher:", error);
      }
    };

    initWaku();
  }, []);

  // Mock function to generate proof
  async function generateProof() {
    console.log("Generating proof...");
    
    // Instantiate ZKPassport
    const zkPassport = new ZKPassport();
    
    // Check if idCommitment is valid from the state
    if (isIdCommitmentValid === false) {
      setStatus("Invalid ID Commitment");
      setIsGenerating(false);
      setQrCodeUrl(null);
      return;
    }
    
    // Wait for validation to complete if it's in progress
    if (isIdCommitmentValid === null && idCommitment) {
      setStatus("Validating ID Commitment...");
      setIsGenerating(false);
      setQrCodeUrl(null);
      return;
    }

    const queryBuilder = await zkPassport.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/logo.png",
      purpose: "Prove your personhood",
      scope: "personhood",
      mode: "compressed-evm",
      devMode: true,
    });

    const { url, onResult, onBridgeConnect, onError, onGeneratingProof, onReject, onProofGenerated, onRequestReceived } = queryBuilder.done();

    setQrCodeUrl(url);

    onBridgeConnect(() => {
      console.log("Bridge connected");
      setStatus("Bridge connected. Please complete the verification on your device.");
    });
    
    onRequestReceived(() => {
      console.log("Request received");
      setStatus("Request received. Please complete the verification on your device.");
      setQrCodeUrl(null);
      setIsLoading(true);
    });
    
    onGeneratingProof(() => {
      console.log("Generating proof");
      setStatus("Generating proof...");
    });

    let proof: ProofResult;
    // Use the proofResult from the onProofGenerated callback to get the proof
    onProofGenerated((proofResult: ProofResult) => {
      proof = proofResult;
      console.log("Proof generated", proof);
      setStatus("Proof generated successfully!");
    });

    onReject(() => {
      console.log("User rejected the request");
      setStatus("User rejected the request");
      setIsGenerating(false);
      setQrCodeUrl(null);
    });
    
    onError((error) => {
      console.error("Error occurred:", error);
      setStatus("An error occurred. Please try again.");
      setIsGenerating(false);
      setQrCodeUrl(null);
    });

    onResult(async ({ verified, uniqueIdentifier, result }) => {
      let rateLimit = 10;
      try {
        if (verified) {
          console.log("Unique identifier", uniqueIdentifier);
          console.log("Result", result);
          setProofData({proof, uniqueIdentifier});
          setShowConfirmation(true);
          setStatus("Verification successful! Please confirm to register RLN membership.");
        } else {
          console.log("Verification failed");
          setStatus("Verification failed");
        }
      } catch (error) {
        console.error("Error during on-chain verification or Waku emission:", error);
        setStatus("Error during on-falsechain verification");
      
      } finally {
        setIsLoading(false);
        setIsGenerating(false);
        setQrCodeUrl(null);
      }
    });
      
    // Return the URL for QR code display
    
  }

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [idCommitment, setIdCommitment] = useState<string>("");
  const [isIdCommitmentValid, setIsIdCommitmentValid] = useState<boolean | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [proofData, setProofData] = useState<{proof: any, uniqueIdentifier: string | undefined} | null>(null);
  const idCommitmentRef = useRef<string>("");
  const [useWaku, setUseWaku] = useState<boolean>(false);
  
  // Validate idCommitment whenever it changes
  useEffect(() => {
    const validateIdCommitment = async () => {
      if (!idCommitment) {
        setIsIdCommitmentValid(null);
        return;
      }
      
      try {
        // Create public client for contract interaction
        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http(),
        });

        // Parse RLN contract ABI
        const rlnAbi = parseAbi([
          "function isValidIdCommitment(uint256 idCommitment) public pure returns (bool)",
          "function isInMembershipSet(uint256 idCommitment) public view returns (bool)"
        ]);

        // Validate idCommitment with RLN contract
        const isValid = await publicClient.readContract({
          address: RLN_CONTRACT_ADDRESS, // RLN contract address
          abi: rlnAbi,
          functionName: "isValidIdCommitment",
          args: [BigInt(idCommitment)],
        });

        // Check if idCommitment is already in membership set
        const isInSet = await publicClient.readContract({
          address: RLN_CONTRACT_ADDRESS,
          abi: rlnAbi,
          functionName: "isInMembershipSet",
          args: [BigInt(idCommitment)],
        });
        
        if (!isValid) {
          setIsIdCommitmentValid(false);
          setStatus("Invalid ID Commitment");
        } else if (isInSet) {
          setIsIdCommitmentValid(false);
          setStatus("ID Commitment is already taken");
        } else {
          setIsIdCommitmentValid(true);
          setStatus("ID Commitment is valid and available");
        }
      } catch (error) {
        console.error("Error validating idCommitment:", error);
        setIsIdCommitmentValid(false);
        setStatus("Error validating ID Commitment");
      }
    };
    
    validateIdCommitment();
  }, [idCommitment]);

  useEffect(() => { 
    const checkIdentifierExists = async () => {
      if (!proofData?.uniqueIdentifier) return;

      // Create public client for contract interaction
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
      });

      console.log("Checking if identifier exists:", proofData);
      const abiCoder = new ethers.AbiCoder();
      const type = 'uint256';
      const value = BigInt(proofData.uniqueIdentifier);
      const encoded = abiCoder.encode([type], [value]);
      console.log("Encoded as uint256:", encoded);


      
      // Check if identifier already exists
      const identifierExists = await publicClient.readContract({
        address: VERIFIER_CONTRACT_ADDRESS,
        abi: [
          {
            "inputs": [
              {
                "internalType": "bytes32",
                "name": "identifier",
                "type": "bytes32"
              }
            ],
            "name": "checkIdentifier",
            "outputs": [
              {
                "internalType": "bool",
                "name": "",
                "type": "bool"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: "checkIdentifier",
        args: [encoded as `0x${string}`],
      });

      if (identifierExists) {
        setStatus("Identifier already exists. Registration aborted.");
        setIsGenerating(false);
        setQrCodeUrl(null);
        setShowConfirmation(false);
        setProofData(null);
        setIdCommitment("");
        setIsIdCommitmentValid(null);
        return;
      }
      setStatus("Identifier is unique. You can proceed with registration.");
    };

    checkIdentifierExists();
  }, [proofData?.uniqueIdentifier]);

  // Keep the ref updated with the latest idCommitment value
  useEffect(() => {
    idCommitmentRef.current = idCommitment;
  }, [idCommitment]);

  const handleConnectWallet = (address: string) => {
    setWalletAddress(address);
    setStatus(`Connected to wallet: ${address.slice(0, 6)}...${address.slice(-4)}`);
  };

  const handleGenerateProof = () => {
    setIsGenerating(true);
    setStatus("Initializing proof generation...");
    generateProof();
  };

  const handleConfirmRegistration = async () => {
    if (!proofData) return;
    
    try {
      setStatus("Submitting transaction...");
      setIsGenerating(true);
      
      // Create public client for contract interaction
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
      });

      let hash;
      if (useWaku) {
        const verifierParams = await getVerifierParams(proofData.proof);
        // When using Waku, just publish the message and let backend handle TX
        const waku = await getInstance(setStatus);
        const message = {
          verification: {
            params: verifierParams,
          },
          idCommitment: idCommitmentRef.current,
          timestamp: Date.now()
        };
        await waku.emit("register", message, undefined, undefined, true);
        setStatus("Message published to Waku! Backend will submit transaction.");
      } else {
        // When not using Waku, submit TX directly
        hash = await verifyOnChain(
          proofData.proof,
          idCommitmentRef.current
        );
        setStatus(`Transaction submitted! Tx Hash: ${hash}`);
      }

      // Reset states
      setShowConfirmation(false);
      setProofData(null);
    } catch (error) {
      console.error("Error during transaction submission:", error);
      setStatus("Error during transaction submission");
    } finally {
      setIsGenerating(false);
      setQrCodeUrl(null);
      setShowConfirmation(false);
      setProofData(null);
      setIdCommitment("");
      setIsIdCommitmentValid(null);
    }
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 sm:p-8 gap-8 sm:gap-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col gap-8 sm:gap-12 row-start-2 items-center w-full max-w-md">
        {/* Wallet Connection */}
        <div className="w-full max-w-xs flex justify-center">
          {!walletAddress ? (
            <WalletConnectButton onConnect={handleConnectWallet} />
          ) : (
            <WalletDetails address={walletAddress} />
          )}
        </div>
        
        {/* Status Display */}
        {status && <p className="text-sm font-medium p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 break-words max-w-full">{status}</p>}
        
        {/* TX Submission Method Toggle */}
        {walletAddress && !isGenerating && (
          <div className="w-full max-w-xs flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Submit TX via:
            </label>
            <div className="flex items-center space-x-2">
              <span className={`text-xs ${!useWaku ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                Self
              </span>
              <button
                type="button"
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${useWaku ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                role="switch"
                aria-checked={useWaku}
                onClick={() => setUseWaku(!useWaku)}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useWaku ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
              <span className={`text-xs ${useWaku ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                Waku
              </span>
            </div>
          </div>
        )}

        {/* ID Commitment Input */}
        {walletAddress && !isGenerating && !showConfirmation && (
          <div className="w-full max-w-xs">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID Commitment
            </label>
            <input
              type="text"
              value={idCommitment}
              onChange={(e) => setIdCommitment(e.target.value)}
              placeholder="Enter ID Commitment"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        )}
        
        {/* Generate Proof Button */}
        {walletAddress && !isGenerating && !showConfirmation && (
          <button
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            onClick={handleGenerateProof}
            disabled={!idCommitment || isIdCommitmentValid !== true}
          >
            Generate Proof
          </button>
        )}
        
        {/* QR Code */}
        {qrCodeUrl && (
          <div className="mt-4">
            <QRCode value={qrCodeUrl} size={256} />
          </div>
        )}
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {/* Confirmation Button */}
        {showConfirmation && (
          <button
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            onClick={handleConfirmRegistration}
          >
            Register RLN Membership
          </button>
        )}
      </main>
    </div>
  );
}
