import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy, hardhat } from 'wagmi/chains';

const isLocal = process.env.NEXT_PUBLIC_CHAIN === 'localhost';

export const wagmiConfig = getDefaultConfig({
  appName: 'StableCoinEC',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: isLocal ? [hardhat] : [polygonAmoy],
  ssr: true,
});
