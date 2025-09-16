"use client";

import { ProofResult, ZKPassport } from "@zkpassport/sdk";
import QRCode from "react-qr-code";
import { useState, useEffect } from "react";
import { getInstance } from "@/lib/waku-dispatcher";
import { verifyOnChain } from "@/lib/onchain";
import WalletConnectButton from "@/components/WalletConnectButton";
import WalletDetails from "@/components/WalletDetails";

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
    
    const queryBuilder = await zkPassport.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/logo.png",
      purpose: "Prove your personhood",
      scope: "personhood",
      mode: "compressed-evm",
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
      try {
        if (verified) {
          console.log("Unique identifier", uniqueIdentifier);
          console.log("Result", result);
          setStatus("Verification successful!");

          if (true) {
            const {
              // The address of the deployed verifier contract
              address,
              // The function name to call on the verifier contract
              functionName,
              // The ABI of the verifier contract
              abi,
            } = zkPassport.getSolidityVerifierDetails("ethereum_sepolia");

                    // Get the verification parameter


            await verifyOnChain(
              proof,
              false
            );
          }
          const waku = await getInstance(setStatus);
          const message = {
            address: "0xc9dE7e861E3b7F6374EA0A12ee22e830dE4adaC3", // Replace with actual recipient address
            uniqueIdentifier,
            verification: {
              proof,
              queryResult: result
            },
            timestamp: Date.now()
          };
          await waku.emit("mint", message, undefined, undefined, true);
          setStatus("Message published to Waku successfully!");
          // For example, you can set up an endpoint to check if the user is registered under
          // this unique identifier in your database
        } else {
          console.log("Verification failed");
        }
      } catch (error) {
        console.error("Error during on-chain verification or Waku emission:", error);
        setStatus("Error during on-chain verification");
      
      } finally {
        setIsGenerating(false);
        setQrCodeUrl(null);
      }
    });
      
    // Return the URL for QR code display
    
  }

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleConnectWallet = (address: string) => {
    setWalletAddress(address);
    setStatus(`Connected to wallet: ${address.slice(0, 6)}...${address.slice(-4)}`);
  };

  const handleGenerateProof = () => {
    setIsGenerating(true);
    setStatus("Initializing proof generation...");
    generateProof();
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        {status && <p className="text-sm text-gray-500 dark:text-gray-400">{status}</p>}
        
        {/* Wallet Connection */}
        <div className="w-full max-w-xs">
          {!walletAddress ? (
            <WalletConnectButton onConnect={handleConnectWallet} />
          ) : (
            <WalletDetails address={walletAddress} />
          )}
        </div>
        
        {/* Generate Proof Button */}
        {walletAddress && !isGenerating && (
          <button
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            onClick={handleGenerateProof}
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
      </main>
    </div>
  );
}
