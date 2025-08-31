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

console.log('CCTP Config Debug - Ethereum RPC URL:', config.rpcUrls.ethereum);

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    id: config.cctpEnvironment === 'testnet' ? 11155111 : 1, // Sepolia : Mainnet
    name: config.cctpEnvironment === 'testnet' ? 'Ethereum Sepolia' : 'Ethereum',
    rpcUrl: config.cctpEnvironment === 'testnet' ? 'https://ethereum-sepolia-rpc.publicnode.com' : config.rpcUrls.ethereum,
    domainId: 0,
    tokenMessengerAddress: config.cctpEnvironment === 'testnet' ? '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' : '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
    messageTransmitterAddress: config.cctpEnvironment === 'testnet' ? '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' : '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81',
    tokenMinterAddress: config.cctpEnvironment === 'testnet' ? '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' : '0xc4922d64a24675E16e1586e3e3Aa56C06fABe907',
    usdcAddress: config.cctpEnvironment === 'testnet' ? '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' : '0xA0b86a33E75A9DB55553dAe29b73E98e82c0c6b5',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: config.features.enableFastTransfer,
  },
  arbitrum: {
    id: config.cctpEnvironment === 'testnet' ? 421614 : 42161, // Arbitrum Sepolia : Arbitrum One
    name: config.cctpEnvironment === 'testnet' ? 'Arbitrum Sepolia' : 'Arbitrum',
    rpcUrl: config.rpcUrls.arbitrum,
    domainId: 3,
    tokenMessengerAddress: config.cctpEnvironment === 'testnet' ? '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' : '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    messageTransmitterAddress: config.cctpEnvironment === 'testnet' ? '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' : '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    tokenMinterAddress: config.cctpEnvironment === 'testnet' ? '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' : '0xE7Ed1fa7f45D05C508232aa32649D89b73b8bA48',
    usdcAddress: config.cctpEnvironment === 'testnet' ? '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' : '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: config.features.enableFastTransfer,
  },
  base: {
    id: config.cctpEnvironment === 'testnet' ? 84532 : 8453, // Base Sepolia : Base
    name: config.cctpEnvironment === 'testnet' ? 'Base Sepolia' : 'Base',
    rpcUrl: config.rpcUrls.base,
    domainId: 6,
    tokenMessengerAddress: config.cctpEnvironment === 'testnet' ? '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' : '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
    messageTransmitterAddress: config.cctpEnvironment === 'testnet' ? '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' : '0xAD09780d193884d503182aD4588450C416D6F9D4',
    tokenMinterAddress: config.cctpEnvironment === 'testnet' ? '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' : '0xc4922d64a24675E16e1586e3e3Aa56C06fABe907',
    usdcAddress: config.cctpEnvironment === 'testnet' ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: config.features.enableFastTransfer,
  },
  avalanche: {
    id: config.cctpEnvironment === 'testnet' ? 43113 : 43114, // Avalanche Fuji : Avalanche
    name: config.cctpEnvironment === 'testnet' ? 'Avalanche Fuji' : 'Avalanche',
    rpcUrl: config.rpcUrls.avalanche,
    domainId: 1,
    tokenMessengerAddress: config.cctpEnvironment === 'testnet' ? '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' : '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982',
    messageTransmitterAddress: config.cctpEnvironment === 'testnet' ? '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' : '0x8186359aF5F57FbB40c6b14A588d2A59C0C29880',
    tokenMinterAddress: config.cctpEnvironment === 'testnet' ? '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' : '0x420f5035fd5dc62a167e7e7f08b604335ae272b8',
    usdcAddress: config.cctpEnvironment === 'testnet' ? '0x5425890298aed601595a70AB815c96711a31Bc65' : '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    supportsSourceTransfer: true,
    supportsDestinationTransfer: true,
    supportsFastTransfer: config.features.enableFastTransfer,
  },
  sonic: {
    id: config.cctpEnvironment === 'testnet' ? 64165 : 146, // Sonic Testnet : Sonic
    name: config.cctpEnvironment === 'testnet' ? 'Sonic Testnet' : 'Sonic',
    rpcUrl: config.rpcUrls.sonic,
    domainId: 4,
    tokenMessengerAddress: config.cctpEnvironment === 'testnet' ? '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' : '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: config.cctpEnvironment === 'testnet' ? '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' : '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    tokenMinterAddress: config.cctpEnvironment === 'testnet' ? '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' : '0xfd78EE919681417d192449715b2594ab58f5D002',
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

    try {
      console.log(`Using RPC URL for ${config.name}:`, config.rpcUrl);
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const usdcContract = new ethers.Contract(
        config.usdcAddress,
        USDC_ABI,
        provider
      );

      // Check if contract exists first
      const code = await provider.getCode(config.usdcAddress);
      console.log(`Contract code check for ${config.usdcAddress} on ${config.name}:`, code.length > 10 ? 'Contract found' : 'No contract');
      if (code === '0x') {
        console.warn(`USDC contract not found at ${config.usdcAddress} for ${config.name} (${chainKey})`);
        return '0';
      }

      const balance = await usdcContract.balanceOf(address);
      
      // Handle case where balance call returns empty data
      if (!balance) {
        return '0';
      }
      
      return ethers.formatUnits(balance, 6);
    } catch (error: any) {
      console.warn(`Failed to check USDC balance for ${chainKey}:`, error.message || error);
      // Return 0 balance if contract call fails (might be wrong address or network)
      return '0';
    }
  }

  async checkUSDCAllowance(owner: string, chainKey: string): Promise<string> {
    const config = SUPPORTED_CHAINS[chainKey];
    if (!config) throw new Error('Unsupported chain');

    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const usdcContract = new ethers.Contract(
        config.usdcAddress,
        USDC_ABI,
        provider
      );

      // Check if contract exists first
      const code = await provider.getCode(config.usdcAddress);
      console.log(`Contract code check for ${config.usdcAddress} on ${config.name}:`, code.length > 10 ? 'Contract found' : 'No contract');
      if (code === '0x') {
        console.warn(`USDC contract not found at ${config.usdcAddress} for ${config.name} (${chainKey})`);
        return '0';
      }

      const allowance = await usdcContract.allowance(owner, config.tokenMessengerAddress);
      
      // Handle case where allowance call returns empty data
      if (!allowance) {
        return '0';
      }
      
      return ethers.formatUnits(allowance, 6);
    } catch (error: any) {
      console.warn(`Failed to check USDC allowance for ${chainKey}:`, error.message || error);
      // Return 0 allowance if contract call fails
      return '0';
    }
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
  ): Promise<{ txHash: string; messageHash: string; sourceDomain: number }> {
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
      console.log('Transaction parameters:');
      console.log('- burnAmount:', burnAmount.toString());
      console.log('- destConfig.domainId:', destConfig.domainId);
      console.log('- recipientAddress:', recipientAddress);
      console.log('- recipientAddress (padded):', ethers.zeroPadValue(recipientAddress, 32));
      console.log('- sourceConfig.usdcAddress:', sourceConfig.usdcAddress);
      console.log('- options:', options);

      if (options.hooks) {
        console.log('Using depositForBurnWithHook');
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
        console.log('Using fast transfer with V2 parameters');
        // V2 Fast transfer parameters
        const destinationCaller = ethers.ZeroHash; // Empty bytes32 for standard transfers
        const maxFee = 500; // Maximum fee
        const minFinalityThreshold = 1000; // Fast transfer threshold ≤1000
        
        tx = await tokenMessenger.depositForBurn(
          burnAmount,
          destConfig.domainId,
          ethers.zeroPadValue(recipientAddress, 32),
          sourceConfig.usdcAddress,
          destinationCaller,
          maxFee,
          minFinalityThreshold,
          {
            gasLimit: options.gasLimit || 300000
          }
        );
      } else {
        console.log('Using standard depositForBurn');
        console.log('About to call depositForBurn with:');
        console.log('  Contract:', tokenMessenger.target);
        console.log('  Function: depositForBurn');
        console.log('  Args:', [
          burnAmount.toString(),
          destConfig.domainId,
          ethers.zeroPadValue(recipientAddress, 32),
          sourceConfig.usdcAddress
        ]);
        
        try {
          // Check allowance first
          const provider = tokenMessenger.runner?.provider;
          if (provider) {
            const usdcContract = new ethers.Contract(sourceConfig.usdcAddress, USDC_ABI, provider);
            const userAddress = await signer.getAddress();
            const allowance = await usdcContract.allowance(userAddress, sourceConfig.tokenMessengerAddress);
            const balance = await usdcContract.balanceOf(userAddress);
            
            console.log('Pre-transaction checks:');
            console.log('- User address:', userAddress);
            console.log('- USDC balance:', ethers.formatUnits(balance, 6));
            console.log('- USDC allowance for TokenMessenger:', ethers.formatUnits(allowance, 6));
            console.log('- Required allowance:', ethers.formatUnits(burnAmount, 6));
            console.log('- TokenMessenger address:', sourceConfig.tokenMessengerAddress);
            
            if (allowance < burnAmount) {
              throw new Error(`Insufficient allowance. Have: ${ethers.formatUnits(allowance, 6)} USDC, Need: ${ethers.formatUnits(burnAmount, 6)} USDC`);
            }
            if (balance < burnAmount) {
              throw new Error(`Insufficient balance. Have: ${ethers.formatUnits(balance, 6)} USDC, Need: ${ethers.formatUnits(burnAmount, 6)} USDC`);
            }
          }
          
          // Standard burn - V2 with required parameters
          const destinationCaller = ethers.ZeroHash; // Empty bytes32 for standard transfers
          const maxFee = 500; // Maximum fee as per Circle's guide
          const minFinalityThreshold = options.useFastTransfer ? 1000 : 0; // Fast transfer threshold
          
          const estimatedGas = await tokenMessenger.depositForBurn.estimateGas(
            burnAmount,
            destConfig.domainId,
            ethers.zeroPadValue(recipientAddress, 32),
            sourceConfig.usdcAddress,
            destinationCaller,
            maxFee,
            minFinalityThreshold
          );
          console.log('Estimated gas:', estimatedGas.toString());
          
          tx = await tokenMessenger.depositForBurn(
            burnAmount,
            destConfig.domainId,
            ethers.zeroPadValue(recipientAddress, 32),
            sourceConfig.usdcAddress,
            destinationCaller,
            maxFee,
            minFinalityThreshold,
            {
              gasLimit: estimatedGas * 120n / 100n // 20% buffer
            }
          );
        } catch (gasError: any) {
          console.error('Gas estimation failed:', gasError);
          throw new Error(`Gas estimation failed: ${gasError.reason || gasError.message}`);
        }
      }

      const receipt = await tx.wait();
      const messageHash = this.extractMessageHashFromReceipt(receipt);

      return {
        txHash: tx.hash,
        messageHash,
        sourceDomain: sourceConfig.domainId,
      };
    } catch (error: any) {
      console.error('Burn transaction failed:', error);
      
      // Log more details about the error
      if (error.reason) {
        console.error('Revert reason:', error.reason);
      }
      if (error.data) {
        console.error('Error data:', error.data);
      }
      if (error.transaction) {
        console.error('Transaction that failed:', error.transaction);
      }
      
      throw new Error(`Transaction failed: ${error.reason || error.message || error}`);
    }
  }

  async getAttestation(messageHash: string, sourceDomain?: number, transactionHash?: string): Promise<string> {
    try {
      let url;
      if (sourceDomain !== undefined && transactionHash) {
        // V2 API format: /v2/messages/{sourceDomain}?transactionHash={txHash}
        url = `${this.apiBaseUrl}/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`;
      } else {
        // Fallback to message hash (original format)
        url = `${this.apiBaseUrl}/v2/messages/${messageHash}`;
      }
      
      console.log('Attestation API URL:', url);
      const response = await axios.get(url);
      console.log('API Response:', response.data);
      
      // Check if the response has messages array (V2 format)
      if (response.data.messages && response.data.messages.length > 0) {
        const message = response.data.messages[0];
        if (message.status === 'complete' && message.attestation) {
          console.log('Attestation found:', message.attestation);
          return message.attestation;
        }
      }
      
      // Fallback for direct attestation property
      if (response.data.attestation) {
        return response.data.attestation;
      }
      
      return null;
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

  async waitForAttestation(messageHash: string, maxWaitTime = 1800000): Promise<string> {
    // Wait for Circle's attestation service to sign the message
    const startTime = Date.now();
    const checkInterval = 10000; // Check every 10 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const attestation = await this.getAttestation(messageHash);
        if (attestation) {
          return attestation;
        }
      } catch (error) {
        // Attestation not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error('Attestation timed out - message may not be finalized yet');
  }

  async getMessageStatus(messageHash: string): Promise<{ status: string; attestation?: string }> {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/v2/messages/${messageHash}/status`
      );
      return response.data;
    } catch (error) {
      return { status: 'PENDING' };
    }
  }

  private extractMessageHashFromReceipt(receipt: any): string {
    // For CCTP V2, we need to hash the message content to get the message hash
    const messageTransmitterInterface = new ethers.Interface(MESSAGE_TRANSMITTER_V2_ABI);
    
    for (const log of receipt.logs) {
      try {
        const parsed = messageTransmitterInterface.parseLog(log);
        if (parsed && parsed.name === 'MessageSent') {
          // The message hash is the keccak256 hash of the message content
          const messageBytes = parsed.args.message;
          const messageHash = ethers.keccak256(messageBytes);
          console.log('Message bytes:', messageBytes);
          console.log('Calculated message hash:', messageHash);
          return messageHash;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('MessageSent event not found in transaction receipt');
  }
}

// Contract ABIs for CCTP V2 - Based on Circle's official documentation
const TOKEN_MESSENGER_V2_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) external returns (uint64)",
  "function depositForBurnWithHook(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold, bytes calldata hookData) external returns (uint64)",
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