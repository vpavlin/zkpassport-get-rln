// Define types for Ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (data: any) => void) => void;
  removeListener?: (event: string, handler: (data: any) => void) => void;
  isMetaMask?: boolean;
}

// Extend the Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}