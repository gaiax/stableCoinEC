import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy, hardhat } from 'viem/chains';

const isLocal = process.env.NEXT_PUBLIC_CHAIN === 'localhost';
const rpcUrl = isLocal
  ? 'http://127.0.0.1:8545'
  : `https://polygon-amoy.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
const chain = isLocal ? hardhat : polygonAmoy;

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
    chain,
    transport: http(rpcUrl),
  });
}

export function getPublicClient() {
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}
