export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  walletConnectProjectId: string;
  cctpEnvironment: 'mainnet' | 'testnet';
  circleApiKey?: string;
  supportedChains: number[];
  appUrl: string;
  apiUrl: string;
  features: {
    enableTestnet: boolean;
    enableHooks: boolean;
    enableFastTransfer: boolean;
  };
  rpcUrls: {
    ethereum: string;
    arbitrum: string;
    base: string;
    avalanche: string;
    sonic: string;
  };
  analytics?: {
    id?: string;
  };
  monitoring?: {
    sentryDsn?: string;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not set`);
    return '';
  }
  return value || defaultValue || '';
};

const getBooleanEnvVar = (key: string, defaultValue = false): boolean => {
  const value = process.env[key];
  return value === 'true' || (value === undefined && defaultValue);
};

const getArrayEnvVar = (key: string, defaultValue: string[] = []): number[] => {
  const value = process.env[key];
  if (!value) return defaultValue.map(Number);
  return value.split(',').map(item => parseInt(item.trim(), 10)).filter(Boolean);
};

export const config: AppConfig = {
  environment: (process.env.NODE_ENV as AppConfig['environment']) || 'development',
  walletConnectProjectId: getEnvVar('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', 'demo-project-id'),
  cctpEnvironment: (getEnvVar('NEXT_PUBLIC_CCTP_ENVIRONMENT', 'testnet') as AppConfig['cctpEnvironment']),
  circleApiKey: getEnvVar('NEXT_PUBLIC_CIRCLE_API_KEY'),
  supportedChains: getArrayEnvVar('NEXT_PUBLIC_SUPPORTED_CHAINS', ['1', '42161', '8453', '43114', '146']),
  appUrl: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  apiUrl: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:3000/api'),
  features: {
    enableTestnet: getBooleanEnvVar('NEXT_PUBLIC_ENABLE_TESTNET', true),
    enableHooks: getBooleanEnvVar('NEXT_PUBLIC_ENABLE_HOOKS', true),
    enableFastTransfer: getBooleanEnvVar('NEXT_PUBLIC_ENABLE_FAST_TRANSFER', true),
  },
  rpcUrls: {
    ethereum: getEnvVar('NEXT_PUBLIC_ETHEREUM_RPC_URL', 'https://eth.llamarpc.com'),
    arbitrum: getEnvVar('NEXT_PUBLIC_ARBITRUM_RPC_URL', 'https://arbitrum.llamarpc.com'),
    base: getEnvVar('NEXT_PUBLIC_BASE_RPC_URL', 'https://base.llamarpc.com'),
    avalanche: getEnvVar('NEXT_PUBLIC_AVALANCHE_RPC_URL', 'https://avalanche.llamarpc.com'),
    sonic: getEnvVar('NEXT_PUBLIC_SONIC_RPC_URL', 'https://rpc.soniclabs.com'),
  },
  analytics: {
    id: getEnvVar('NEXT_PUBLIC_ANALYTICS_ID'),
  },
  monitoring: {
    sentryDsn: getEnvVar('NEXT_PUBLIC_SENTRY_DSN'),
  },
};

// Validation
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.walletConnectProjectId || config.walletConnectProjectId === 'demo-project-id') {
    errors.push('WalletConnect Project ID is not configured. Get one from https://cloud.walletconnect.com/');
  }

  if (config.environment === 'production') {
    if (!config.circleApiKey) {
      errors.push('Circle API key is required for production');
    }

    if (config.cctpEnvironment !== 'mainnet') {
      errors.push('Production environment should use mainnet CCTP');
    }

    if (config.features.enableTestnet) {
      console.warn('Testnet features are enabled in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper functions
export const isProduction = () => config.environment === 'production';
export const isDevelopment = () => config.environment === 'development';
export const isTestnet = () => config.cctpEnvironment === 'testnet';

export default config;