'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Add ethereum to the Window interface if not already defined
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletDetailsProps {
  address: string | null;
}

export default function WalletDetails({ address }: WalletDetailsProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>("11155111");

  useEffect(() => {
    if (!address || typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    let provider: ethers.BrowserProvider;

    const fetchWalletData = async () => {
      try {
        // Create provider
        provider = new ethers.BrowserProvider(window.ethereum!);
        
        // Get network
        const network = await provider.getNetwork();
        setChainId(network.chainId.toString());

        // Get balance
        const balance = await provider.getBalance(address);
        
        // Convert wei to ether
        const etherBalance = Number(ethers.formatEther(balance));
        setBalance(etherBalance.toFixed(4));
      } catch (error) {
        console.error('Error fetching wallet data:', error);
      }
    };

    fetchWalletData();

    // Listen for account or chain changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Handle disconnection
        setBalance(null);
        setChainId(null);
      } else {
        // Update data with new account
        fetchWalletData();
      }
    };

    const handleChainChanged = (newChainId: string) => {
      setChainId(newChainId);
      // Refresh balance when chain changes
      fetchWalletData();
    };

    // Add event listeners if they exist
    if (window.ethereum?.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [address]);

  if (!address) {
    return null;
  }

  // Format address with ellipsis
  const formattedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mt-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-2">Wallet Details</h3>
      <div className="space-y-2">
        <div>
          <span className="font-medium">Address:</span>{' '}
          <span className="font-mono">{formattedAddress}</span>
        </div>
        {chainId && (
          <div>
            <span className="font-medium">Chain ID:</span> {chainId}
          </div>
        )}
        {balance !== null && (
          <div>
            <span className="font-medium">Balance:</span> {balance} ETH
          </div>
        )}
      </div>
    </div>
  );
}