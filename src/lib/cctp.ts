import { ethers } from 'ethers';
import axios from 'axios';
import config from './config';

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  domainId: number;
  tokenMessengerAddress: string;
  messageTransmitterAddress: string;
  tokenMinterAddress: string;
  usdcAddress: string;
  supportsSourceTransfer: boolean;
  supportsDestinationTransfer: boolean;
  supportsFastTransfer: boolean;
  isTestnet?: boolean;
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: config.rpcUrls.ethereum,
    domainId: 0,
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    tokenMinterAddress: '0xfd78EE919681417d192449715b2594ab58f5D002',
    usdcAddress: config.cctpEnvironment === 'testnet' ? '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' : '0xA0b86a33E75A9DB55553dAe29b73E98e82c0c6b5',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: config.features.enableFastTransfer,
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    rpcUrl: config.rpcUrls.arbitrum,
    domainId: 3,
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    tokenMinterAddress: '0xfd78EE919681417d192449715b2594ab58f5D002',
    usdcAddress: config.cctpEnvironment === 'testnet' ? '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' : '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: config.features.enableFastTransfer,
  },
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: config.rpcUrls.base,
    domainId: 6,
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    tokenMinterAddress: '0xfd78EE919681417d192449715b2594ab58f5D002',
    usdcAddress: config.cctpEnvironment === 'testnet' ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: config.features.enableFastTransfer,
  },
  avalanche: {
    id: 43114,
    name: 'Avalanche',
    rpcUrl: config.rpcUrls.avalanche,
    domainId: 1,
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    tokenMinterAddress: '0xfd78EE919681417d192449715b2594ab58f5D002',
    usdcAddress: config.cctpEnvironment === 'testnet' ? '0x5425890298aed601595a70AB815c96711a31Bc65' : '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: config.features.enableFastTransfer,
  },
  sonic: {
    id: 146,
    name: 'Sonic',
    rpcUrl: config.rpcUrls.sonic,
    domainId: 4,
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    tokenMinterAddress: '0xfd78EE919681417d192449715b2594ab58f5D002',
    usdcAddress: config.cctpEnvironment === 'testnet' ? '0x5425890298aed601595a70AB815c96711a31Bc65' : '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: config.features.enableFastTransfer,
  },
};

export const CCTP_API_BASE = {
  testnet: 'https://iris-api-sandbox.circle.com',
  mainnet: 'https://iris-api.circle.com',
};

export interface TransferOptions {
  useFastTransfer?: boolean;
  hooks?: string;
  gasLimit?: number;
}

export class CCTPService {
  private apiBaseUrl: string;
  private isTestnet: boolean;

  constructor(isTestnet = config.cctpEnvironment === 'testnet') {
    this.isTestnet = isTestnet;
    this.apiBaseUrl = isTestnet ? CCTP_API_BASE.testnet : CCTP_API_BASE.mainnet;
  }

  async checkUSDCBalance(address: string, chainKey: string): Promise<string> {
    const config = SUPPORTED_CHAINS[chainKey];
    if (!config) throw new Error('Unsupported chain');

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const usdcContract = new ethers.Contract(
      config.usdcAddress,
      USDC_ABI,
      provider
    );

    const balance = await usdcContract.balanceOf(address);
    return ethers.formatUnits(balance, 6);
  }

  async checkUSDCAllowance(owner: string, chainKey: string): Promise<string> {
    const config = SUPPORTED_CHAINS[chainKey];
    if (!config) throw new Error('Unsupported chain');

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const usdcContract = new ethers.Contract(
      config.usdcAddress,
      USDC_ABI,
      provider
    );

    const allowance = await usdcContract.allowance(owner, config.tokenMessengerAddress);
    return ethers.formatUnits(allowance, 6);
  }

  async approveUSDC(amount: string, chainKey: string, signer: ethers.Signer): Promise<string> {
    const config = SUPPORTED_CHAINS[chainKey];
    if (!config) throw new Error('Unsupported chain');

    const usdcContract = new ethers.Contract(
      config.usdcAddress,
      USDC_ABI,
      signer
    );

    const approveAmount = ethers.parseUnits(amount, 6);
    const tx = await usdcContract.approve(config.tokenMessengerAddress, approveAmount);
    await tx.wait();
    return tx.hash;
  }

  async initiateBurn(
    sourceChain: string,
    destinationChain: string,
    amount: string,
    recipientAddress: string,
    signer: ethers.Signer,
    options: TransferOptions = {}
  ): Promise<{ txHash: string; messageHash: string }> {
    const sourceConfig = SUPPORTED_CHAINS[sourceChain];
    const destConfig = SUPPORTED_CHAINS[destinationChain];

    if (!sourceConfig || !destConfig) {
      throw new Error('Unsupported chain');
    }

    // Validate amount
    const burnAmount = ethers.parseUnits(amount, 6);
    if (burnAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // Check balance
    const userAddress = await signer.getAddress();
    const balance = await this.checkUSDCBalance(userAddress, sourceChain);
    if (parseFloat(balance) < parseFloat(amount)) {
      throw new Error(`Insufficient USDC balance. Have: ${balance}, Need: ${amount}`);
    }

    // Check allowance
    const allowance = await this.checkUSDCAllowance(userAddress, sourceChain);
    if (parseFloat(allowance) < parseFloat(amount)) {
      throw new Error(`Insufficient USDC allowance. Please approve ${amount} USDC first.`);
    }

    const tokenMessenger = new ethers.Contract(
      sourceConfig.tokenMessengerAddress,
      TOKEN_MESSENGER_V2_ABI,
      signer
    );

    let tx;
    try {
      if (options.hooks) {
        // Use depositForBurnWithHook for V2 hooks
        tx = await tokenMessenger.depositForBurnWithHook(
          burnAmount,
          destConfig.domainId,
          ethers.zeroPadValue(recipientAddress, 32),
          sourceConfig.usdcAddress,
          options.hooks,
          {
            gasLimit: options.gasLimit || 500000
          }
        );
      } else if (options.useFastTransfer && sourceConfig.supportsFastTransfer && destConfig.supportsFastTransfer) {
        // Use fast transfer
        tx = await tokenMessenger.depositForBurnWithCaller(
          burnAmount,
          destConfig.domainId,
          ethers.zeroPadValue(recipientAddress, 32),
          sourceConfig.usdcAddress,
          ethers.zeroPadValue(recipientAddress, 32),
          {
            gasLimit: options.gasLimit || 300000
          }
        );
      } else {
        // Standard burn
        tx = await tokenMessenger.depositForBurn(
          burnAmount,
          destConfig.domainId,
          ethers.zeroPadValue(recipientAddress, 32),
          sourceConfig.usdcAddress,
          {
            gasLimit: options.gasLimit || 250000
          }
        );
      }

      const receipt = await tx.wait();
      const messageHash = this.extractMessageHashFromReceipt(receipt);

      return {
        txHash: tx.hash,
        messageHash,
      };
    } catch (error: any) {
      console.error('Burn transaction failed:', error);
      throw new Error(`Transaction failed: ${error.message || error}`);
    }
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
    signer: ethers.Signer,
    useUnfinalized = false
  ): Promise<string> {
    const destConfig = SUPPORTED_CHAINS[destinationChain];
    if (!destConfig) {
      throw new Error('Unsupported destination chain');
    }

    const messageTransmitter = new ethers.Contract(
      destConfig.messageTransmitterAddress,
      MESSAGE_TRANSMITTER_V2_ABI,
      signer
    );

    let tx;
    try {
      if (useUnfinalized) {
        // Use V2 unfinalized message for fast transfers
        tx = await messageTransmitter.receiveMessageUnfinalized(messageBytes, attestation, {
          gasLimit: 400000
        });
      } else {
        // Standard message reception
        tx = await messageTransmitter.receiveMessage(messageBytes, attestation, {
          gasLimit: 350000
        });
      }

      const receipt = await tx.wait();
      return tx.hash;
    } catch (error: any) {
      console.error('Mint transaction failed:', error);
      throw new Error(`Mint failed: ${error.message || error}`);
    }
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
    const messageTransmitterInterface = new ethers.Interface(MESSAGE_TRANSMITTER_V2_ABI);
    
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

// Contract ABIs for CCTP V2
const TOKEN_MESSENGER_V2_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64)",
  "function depositForBurnWithCaller(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller) external returns (uint64)",
  "function depositForBurnWithHook(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes calldata hookData) external returns (uint64)",
  "event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationTokenMessenger, bytes32 destinationCaller)",
];

const MESSAGE_TRANSMITTER_V2_ABI = [
  "function receiveMessage(bytes memory message, bytes calldata attestation) external returns (bool)",
  "function receiveMessageUnfinalized(bytes memory message, bytes calldata attestation) external returns (bool)",
  "event MessageSent(bytes message)",
  "event MessageReceived(address indexed caller, uint32 sourceDomain, uint64 indexed nonce, bytes32 sender, bytes messageBody)",
];

const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

export { TOKEN_MESSENGER_V2_ABI, MESSAGE_TRANSMITTER_V2_ABI, USDC_ABI };