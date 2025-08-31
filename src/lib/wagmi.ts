import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  sepolia,
  avalanche,
  avalancheFuji,
} from 'wagmi/chains';
import config from './config';

// Define Sonic chains
const sonic = {
  id: 146,
  name: 'Sonic',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Sonic Explorer', url: 'https://explorer.soniclabs.com' },
  },
} as const;

const sonicTestnet = {
  id: 64165,
  name: 'Sonic Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Sonic Testnet Explorer', url: 'https://testnet.explorer.soniclabs.com' },
  },
} as const;

// Select chains based on environment
const getChains = () => {
  if (config.cctpEnvironment === 'testnet') {
    return [sepolia, arbitrumSepolia, baseSepolia, avalancheFuji, sonicTestnet] as const;
  }
  return [mainnet, arbitrum, base, avalanche, sonic] as const;
};

const chains = getChains();

export const wagmiConfig = getDefaultConfig({
  appName: 'MorphPay',
  projectId: config.walletConnectProjectId,
  chains,
  ssr: true,
});

export { wagmiConfig as config };