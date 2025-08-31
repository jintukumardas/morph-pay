import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  avalanche,
} from 'wagmi/chains';
import config from './config';

// Define Sonic chain (not in wagmi/chains yet)
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

export const wagmiConfig = getDefaultConfig({
  appName: 'MorphPay',
  projectId: config.walletConnectProjectId,
  chains: [mainnet, arbitrum, base, avalanche, sonic],
  ssr: true,
});

export { wagmiConfig as config };