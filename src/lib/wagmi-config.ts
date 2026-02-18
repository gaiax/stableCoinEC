import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'StableCoinEC',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [polygonAmoy],
  ssr: true,
});
