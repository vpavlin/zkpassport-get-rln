'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

// Add ethereum to the Window interface if not already defined
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function WalletConnectButton({ onConnect }: { onConnect: (address: string) => void }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask or another Ethereum wallet');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Create provider and request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Ensure we're on Sepolia network
      const network = await provider.getNetwork();
      const sepoliaChainId = 11155111;
      
      if (network.chainId !== BigInt(sepoliaChainId)) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
          });
        } catch (switchError: any) {
          // If the network isn't added, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0xaa36a7',
                    chainName: 'Sepolia Test Network',
                    nativeCurrency: {
                      name: 'Ethereum',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io'],
                  },
                ],
              });
            } catch (addError: any) {
              console.error('Error adding Sepolia network:', addError);
              setError('Failed to add Sepolia network');
              setConnecting(false);
              return;
            }
          } else {
            console.error('Error switching network:', switchError);
            setError('Failed to switch to Sepolia network');
            setConnecting(false);
            return;
          }
        }
      }

      onConnect(address);
    } catch (err: any) {
      if (err.code === 4001) {
        setError('User rejected the request');
      } else {
        setError('Failed to connect: ' + err.message);
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      <button
              onClick={connectWallet}
              disabled={connecting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded flex items-center shadow-md hover:shadow-lg transition-shadow"
            >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}