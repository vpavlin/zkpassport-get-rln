import { VERIFIER_CONTRACT_ADDRESS } from "./constants.js";
import { createWalletClient, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { custom } from "viem";
import { ethers } from "ethers";

export async function verifyOnChain(verifierParams: any, idCommitment: string) {

 // 1. Configure provider (Infura/Alchemy/your node)
const provider = new ethers.JsonRpcProvider(process.env.LINEA_RPC);

// 2. Load your PRIVATE KEY (MUST have minting privileges)
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

 
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

  const contract = new ethers.Contract(VERIFIER_CONTRACT_ADDRESS, abi, wallet);

  const tx = await contract.registerIdentifier(...args);
  const receipt = await tx.wait(); // Wait for confirmation

  console.log("Verification completed on-chain!", tx);
  return tx;
}