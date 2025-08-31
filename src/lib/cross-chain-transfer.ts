import { ethers } from 'ethers';
import { CCTPService, SUPPORTED_CHAINS, TransferOptions } from './cctp';
import { CCTPHooksService, HookMetadata } from './hooks';

export interface CrossChainTransferResult {
  sourceTransactionHash: string;
  messageHash: string;
  destinationTransactionHash?: string;
  status: 'PENDING' | 'ATTESTED' | 'COMPLETED' | 'FAILED';
  attestation?: string;
  hookId?: string;
  estimatedCompletionTime?: number;
}

export interface TransferProgress {
  step: 'BURNING' | 'WAITING_ATTESTATION' | 'READY_TO_MINT' | 'MINTING' | 'COMPLETED' | 'FAILED';
  message: string;
  txHash?: string;
  progress: number; // 0-100
  timeElapsed: number;
}

export class CrossChainTransferService {
  private cctp: CCTPService;
  private hooksService: CCTPHooksService;

  constructor() {
    this.cctp = new CCTPService();
    this.hooksService = new CCTPHooksService();
  }

  async initiateTransfer(
    sourceChain: string,
    destinationChain: string,
    amount: string,
    recipientAddress: string,
    signer: ethers.Signer,
    options?: {
      useFastTransfer?: boolean;
      enableHooks?: boolean;
      hookMetadata?: HookMetadata;
      onProgress?: (progress: TransferProgress) => void;
    }
  ): Promise<CrossChainTransferResult> {
    const startTime = Date.now();
    const onProgress = options?.onProgress || (() => {});

    try {
      // Step 1: Initiate burn transaction
      onProgress({
        step: 'BURNING',
        message: `Burning ${amount} USDC on ${SUPPORTED_CHAINS[sourceChain].name}...`,
        progress: 10,
        timeElapsed: Date.now() - startTime
      });

      let burnResult;
      if (options?.enableHooks && options.hookMetadata) {
        burnResult = await this.hooksService.initiateBurnWithHooks(
          sourceChain,
          destinationChain,
          amount,
          recipientAddress,
          signer,
          options.hookMetadata
        );
      } else {
        const transferOptions: TransferOptions = {
          useFastTransfer: options?.useFastTransfer || false,
          gasLimit: options?.useFastTransfer ? 300000 : 250000
        };

        burnResult = await this.cctp.initiateBurn(
          sourceChain,
          destinationChain,
          amount,
          recipientAddress,
          signer,
          transferOptions
        );
      }

      onProgress({
        step: 'WAITING_ATTESTATION',
        message: 'Waiting for Circle attestation service...',
        txHash: burnResult.txHash,
        progress: 30,
        timeElapsed: Date.now() - startTime
      });

      // Step 2: Wait for attestation
      const attestation = await this.waitForAttestationWithProgress(
        burnResult.messageHash,
        options?.useFastTransfer ? 30000 : 1200000, // 30s for fast, 20min for standard
        (progressPercent) => {
          onProgress({
            step: 'WAITING_ATTESTATION',
            message: 'Waiting for Circle attestation service...',
            txHash: burnResult.txHash,
            progress: 30 + (progressPercent * 0.4), // 30-70%
            timeElapsed: Date.now() - startTime
          });
        }
      );

      onProgress({
        step: 'READY_TO_MINT',
        message: `Ready to mint USDC on ${SUPPORTED_CHAINS[destinationChain].name}`,
        progress: 75,
        timeElapsed: Date.now() - startTime
      });

      return {
        sourceTransactionHash: burnResult.txHash,
        messageHash: burnResult.messageHash,
        status: 'ATTESTED',
        attestation,
        hookId: 'hookId' in burnResult ? (burnResult.hookId as string) : undefined,
        estimatedCompletionTime: Date.now() + (options?.useFastTransfer ? 30000 : 300000)
      };

    } catch (error: any) {
      onProgress({
        step: 'FAILED',
        message: `Transfer failed: ${error.message}`,
        progress: 0,
        timeElapsed: Date.now() - startTime
      });

      throw error;
    }
  }

  async completeTransfer(
    result: CrossChainTransferResult,
    destinationChain: string,
    signer: ethers.Signer,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<CrossChainTransferResult> {
    if (!result.attestation) {
      throw new Error('Attestation not available');
    }

    const startTime = Date.now();
    onProgress = onProgress || (() => {});

    try {
      onProgress({
        step: 'MINTING',
        message: `Minting USDC on ${SUPPORTED_CHAINS[destinationChain].name}...`,
        progress: 80,
        timeElapsed: Date.now() - startTime
      });

      // Extract message bytes from the message hash for minting
      const messageBytes = await this.getMessageBytes(result.messageHash);
      
      const mintTxHash = await this.cctp.completeMint(
        destinationChain,
        messageBytes,
        result.attestation,
        signer,
        false // useUnfinalized - set based on transfer type
      );

      onProgress({
        step: 'COMPLETED',
        message: 'Transfer completed successfully!',
        txHash: mintTxHash,
        progress: 100,
        timeElapsed: Date.now() - startTime
      });

      return {
        ...result,
        destinationTransactionHash: mintTxHash,
        status: 'COMPLETED'
      };

    } catch (error: any) {
      onProgress({
        step: 'FAILED',
        message: `Minting failed: ${error.message}`,
        progress: 80,
        timeElapsed: Date.now() - startTime
      });

      throw error;
    }
  }

  async autoCompleteTransfer(
    sourceChain: string,
    destinationChain: string,
    amount: string,
    recipientAddress: string,
    sourceSigner: ethers.Signer,
    destinationSigner: ethers.Signer,
    options?: {
      useFastTransfer?: boolean;
      enableHooks?: boolean;
      hookMetadata?: HookMetadata;
      onProgress?: (progress: TransferProgress) => void;
    }
  ): Promise<CrossChainTransferResult> {
    // Initiate the transfer
    const initiateResult = await this.initiateTransfer(
      sourceChain,
      destinationChain,
      amount,
      recipientAddress,
      sourceSigner,
      options
    );

    // Auto-complete the transfer
    const finalResult = await this.completeTransfer(
      initiateResult,
      destinationChain,
      destinationSigner,
      options?.onProgress
    );

    return finalResult;
  }

  async getTransferStatus(messageHash: string): Promise<TransferProgress> {
    try {
      const status = await this.cctp.getMessageStatus(messageHash);
      
      switch (status.status) {
        case 'PENDING':
          return {
            step: 'WAITING_ATTESTATION',
            message: 'Waiting for attestation...',
            progress: 40,
            timeElapsed: 0
          };
        case 'ATTESTED':
          return {
            step: 'READY_TO_MINT',
            message: 'Ready to mint on destination chain',
            progress: 75,
            timeElapsed: 0
          };
        case 'COMPLETED':
          return {
            step: 'COMPLETED',
            message: 'Transfer completed',
            progress: 100,
            timeElapsed: 0
          };
        default:
          return {
            step: 'WAITING_ATTESTATION',
            message: 'Processing...',
            progress: 20,
            timeElapsed: 0
          };
      }
    } catch (error) {
      return {
        step: 'FAILED',
        message: 'Failed to get transfer status',
        progress: 0,
        timeElapsed: 0
      };
    }
  }

  private async waitForAttestationWithProgress(
    messageHash: string,
    maxWaitTime: number,
    onProgress: (progressPercent: number) => void
  ): Promise<string> {
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const attestation = await this.cctp.getAttestation(messageHash);
        if (attestation) {
          onProgress(100);
          return attestation;
        }
      } catch (error) {
        // Attestation not ready yet, continue waiting
      }
      
      // Update progress based on time elapsed
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / maxWaitTime) * 100, 95);
      onProgress(progressPercent);
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error('Attestation timed out - message may not be finalized yet');
  }

  private async getMessageBytes(messageHash: string): Promise<string> {
    try {
      const response = await fetch(`${this.cctp['apiBaseUrl']}/v2/messages/${messageHash}`);
      const data = await response.json();
      return data.messageBytes || '0x';
    } catch (error) {
      // Fallback - in production you would need the actual message bytes
      return '0x';
    }
  }

  // Utility methods for demo purposes
  async estimateTransferTime(
    sourceChain: string,
    destinationChain: string,
    useFastTransfer: boolean
  ): Promise<{ min: number; max: number }> {
    const sourceConfig = SUPPORTED_CHAINS[sourceChain];
    const destConfig = SUPPORTED_CHAINS[destinationChain];

    if (useFastTransfer && sourceConfig.supportsFastTransfer && destConfig.supportsFastTransfer) {
      return { min: 8, max: 20 }; // seconds
    } else {
      return { min: 10, max: 20 }; // minutes
    }
  }

  async calculateTotalFees(
    sourceChain: string,
    destinationChain: string
  ): Promise<{ transferFee: string; gasFee: string; totalFee: string }> {
    try {
      const transferFee = await this.cctp.getTransferFees(sourceChain, destinationChain);
      
      // Estimate gas fees (simplified calculation)
      const estimatedGasPrice = 20; // gwei
      const estimatedGasLimit = 300000;
      const gasFee = (estimatedGasPrice * estimatedGasLimit / 1e9).toString();
      
      const totalFee = (parseFloat(transferFee) + parseFloat(gasFee)).toString();
      
      return {
        transferFee,
        gasFee,
        totalFee
      };
    } catch (error) {
      return {
        transferFee: '0',
        gasFee: '0.01',
        totalFee: '0.01'
      };
    }
  }
}