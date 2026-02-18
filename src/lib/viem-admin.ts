import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';

const alchemyUrl = `https://polygon-amoy.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

export function getAdminAccount() {
  const privateKey = process.env.ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ADMIN_PRIVATE_KEY is not set');
  }
  return privateKeyToAccount(privateKey as `0x${string}`);
}

export function getAdminWalletClient() {
  const account = getAdminAccount();
  return createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http(alchemyUrl),
  });
}

export function getPublicClient() {
  return createPublicClient({
    chain: polygonAmoy,
    transport: http(alchemyUrl),
  });
}
