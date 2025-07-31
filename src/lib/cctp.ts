import { ethers } from 'ethers';
import axios from 'axios';

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  domainId: number;
  tokenMessengerAddress: string;
  messageTransmitterAddress: string;
  usdcAddress: string;
  supportsSourceTransfer: boolean;
  supportsDestinationTransfer: boolean;
  supportsFastTransfer: boolean;
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    domainId: 0,
    tokenMessengerAddress: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
    messageTransmitterAddress: '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81',
    usdcAddress: '0xA0b86a33E75A9DB55553dAe29b73E98e82c0c6b5',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: true,
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    rpcUrl: 'https://arbitrum.llamarpc.com',
    domainId: 3,
    tokenMessengerAddress: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    messageTransmitterAddress: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: true,
  },
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://base.llamarpc.com',
    domainId: 6,
    tokenMessengerAddress: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
    messageTransmitterAddress: '0xAD09780d193884d503182aD4588450C416D6F9D4',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: true,
  },
  avalanche: {
    id: 43114,
    name: 'Avalanche',
    rpcUrl: 'https://avalanche.llamarpc.com',
    domainId: 1,
    tokenMessengerAddress: '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982',
    messageTransmitterAddress: '0x8186359aF5F57FbB40c6b14A588d2A59C0C29880',
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: false,
  },
  sonic: {
    id: 146,
    name: 'Sonic',
    rpcUrl: 'https://rpc.soniclabs.com',
    domainId: 4,
    tokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitterAddress: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    usdcAddress: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: false,
  },
};

export const CCTP_API_BASE = {
  testnet: 'https://iris-api-sandbox.circle.com',
  mainnet: 'https://iris-api.circle.com',
};

export class CCTPService {
  private apiBaseUrl: string;
  private isTestnet: boolean;

  constructor(isTestnet = false) {
    this.isTestnet = isTestnet;
    this.apiBaseUrl = isTestnet ? CCTP_API_BASE.testnet : CCTP_API_BASE.mainnet;
  }

  async initiateBurn(
    sourceChain: string,
    destinationChain: string,
    amount: string,
    recipientAddress: string,
    signer: ethers.Signer,
    hooks?: string
  ): Promise<{ txHash: string; messageHash: string }> {
    const sourceConfig = SUPPORTED_CHAINS[sourceChain];
    const destConfig = SUPPORTED_CHAINS[destinationChain];

    if (!sourceConfig || !destConfig) {
      throw new Error('Unsupported chain');
    }

    const provider = new ethers.JsonRpcProvider(sourceConfig.rpcUrl);
    const tokenMessenger = new ethers.Contract(
      sourceConfig.tokenMessengerAddress,
      TOKEN_MESSENGER_ABI,
      signer
    );

    const burnAmount = ethers.parseUnits(amount, 6); // USDC has 6 decimals

    let tx;
    if (hooks) {
      // Use depositForBurnWithCaller for hooks
      tx = await tokenMessenger.depositForBurnWithCaller(
        burnAmount,
        destConfig.domainId,
        ethers.zeroPadValue(recipientAddress, 32),
        sourceConfig.usdcAddress,
        ethers.zeroPadValue(recipientAddress, 32) // destinationCaller
      );
    } else {
      // Standard burn
      tx = await tokenMessenger.depositForBurn(
        burnAmount,
        destConfig.domainId,
        ethers.zeroPadValue(recipientAddress, 32),
        sourceConfig.usdcAddress
      );
    }

    const receipt = await tx.wait();
    const messageHash = this.extractMessageHashFromReceipt(receipt);

    return {
      txHash: tx.hash,
      messageHash,
    };
  }

  async getAttestation(messageHash: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/v1/attestations/${messageHash}`
      );
      return response.data.attestation;
    } catch (error) {
      throw new Error('Failed to get attestation');
    }
  }

  async completeMint(
    destinationChain: string,
    messageBytes: string,
    attestation: string,
    signer: ethers.Signer
  ): Promise<string> {
    const destConfig = SUPPORTED_CHAINS[destinationChain];
    if (!destConfig) {
      throw new Error('Unsupported destination chain');
    }

    const messageTransmitter = new ethers.Contract(
      destConfig.messageTransmitterAddress,
      MESSAGE_TRANSMITTER_ABI,
      signer
    );

    const tx = await messageTransmitter.receiveMessage(messageBytes, attestation);
    const receipt = await tx.wait();

    return tx.hash;
  }

  async getFastTransferAllowance(sourceChain: string, destinationChain: string): Promise<string> {
    const sourceConfig = SUPPORTED_CHAINS[sourceChain];
    const destConfig = SUPPORTED_CHAINS[destinationChain];

    const response = await axios.get(
      `${this.apiBaseUrl}/v2/fastBurn/USDC/allowance?sourceDomainId=${sourceConfig.domainId}&destDomainId=${destConfig.domainId}`
    );

    return response.data.allowance;
  }

  async getTransferFees(sourceChain: string, destinationChain: string): Promise<string> {
    const sourceConfig = SUPPORTED_CHAINS[sourceChain];
    const destConfig = SUPPORTED_CHAINS[destinationChain];

    const response = await axios.get(
      `${this.apiBaseUrl}/v2/burn/USDC/fees/${sourceConfig.domainId}/${destConfig.domainId}`
    );

    return response.data.fee;
  }

  private extractMessageHashFromReceipt(receipt: any): string {
    // Extract message hash from MessageSent event
    const messageTransmitterInterface = new ethers.Interface(MESSAGE_TRANSMITTER_ABI);
    
    for (const log of receipt.logs) {
      try {
        const parsed = messageTransmitterInterface.parseLog(log);
        if (parsed && parsed.name === 'MessageSent') {
          return parsed.args.message;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('MessageSent event not found in transaction receipt');
  }
}

// Contract ABIs (simplified for key functions)
const TOKEN_MESSENGER_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64)",
  "function depositForBurnWithCaller(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller) external returns (uint64)",
];

const MESSAGE_TRANSMITTER_ABI = [
  "function receiveMessage(bytes memory message, bytes calldata attestation) external returns (bool)",
  "event MessageSent(bytes message)",
];

export { TOKEN_MESSENGER_ABI, MESSAGE_TRANSMITTER_ABI };