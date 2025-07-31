import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  avalanche,
} from 'wagmi/chains';

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

export const config = getDefaultConfig({
  appName: 'MorphPay',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [mainnet, arbitrum, base, avalanche, sonic],
  ssr: true,
});