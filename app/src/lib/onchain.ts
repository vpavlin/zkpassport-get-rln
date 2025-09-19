import { SolidityVerifierParameters, ZKPassport } from "@zkpassport/sdk";
import { VERIFIER_CONTRACT_ADDRESS } from "./constants";
import { createWalletClient, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { custom } from "viem";

export async function getVerifierParams(proofResult: any):Promise<SolidityVerifierParameters> {
  const zkPassport = new ZKPassport();

  // Validate proofResult
  if (!proofResult) {
    throw new Error("proofResult is required but was not provided");
  }

  // Additional validation for common expected fields
  if (!proofResult.proof && !proofResult.publicInputs) {
    throw new Error("proofResult must contain 'proof' or 'publicInputs'");
  }

  // Get verification parameters
  const verifierParams = zkPassport.getSolidityVerifierParameters({
    proof: proofResult,
    // Use the same scope as the one you specified with the request function
    scope: "personhood",
    // Enable dev mode if you want to use mock passports, otherwise keep it false
    devMode: true,
  });

  return verifierParams;

}

export async function verifyOnChain(proofResult: any, idCommitment: string) {
  const verifierParams = await getVerifierParams(proofResult);

 // @ts-ignore
 if (!window || !window.ethereum) {
   throw new Error("No Ethereum provider found. Please install MetaMask.");
 }
 const walletClient = createWalletClient({
   chain: sepolia,
   // @ts-ignore
   transport: custom(window.ethereum!)
 })

 // Get the account
 const [account] = await walletClient.getAddresses();

 // Create a public client for transaction confirmation
 const publicClient = createPublicClient({
   chain: sepolia,
   transport: http(),
 });


 
 if (!idCommitment) {
   throw new Error("idCommitment not provided");
 }

  const abi = [
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "vkeyHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "proof",
              "type": "bytes"
            },
            {
              "internalType": "bytes32[]",
              "name": "publicInputs",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes",
              "name": "committedInputs",
              "type": "bytes"
            },
            {
              "internalType": "uint256[]",
              "name": "committedInputCounts",
              "type": "uint256[]"
            },
            {
              "internalType": "uint256",
              "name": "validityPeriodInSeconds",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "domain",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "scope",
              "type": "string"
            },
            {
              "internalType": "bool",
              "name": "devMode",
              "type": "bool"
            }
          ],
          "internalType": "struct ProofVerificationParams",
          "name": "params",
          "type": "tuple"
        },
        {
          "internalType": "uint256",
          "name": "idCommitment",
          "type": "uint256"
        },
        {
          "internalType": "uint32",
          "name": "rateLimit",
          "type": "uint32"
        }
      ],
      "name": "registerIdentifier",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
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
  ];

  const args = [verifierParams, BigInt(idCommitment), 100];
  console.log(args);


  // Call your contract with the verification parameters
  const hash = await walletClient.writeContract({
    address: VERIFIER_CONTRACT_ADDRESS,
    abi: abi,
    functionName: "registerIdentifier",
    args: args,
    account,
  });

  // Wait for the transaction
  await publicClient.waitForTransactionReceipt({ hash });

  console.log("Verification completed on-chain!", hash);
  return hash;
}