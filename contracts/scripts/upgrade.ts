/**
 * アップグレードスクリプト
 *
 * 既存のJpycSplitMarketplace ProxyをV2にアップグレード
 *
 * 使い方:
 *   PROXY_ADDRESS=0x... npx hardhat run scripts/upgrade.ts --network amoy
 *   PROXY_ADDRESS=0x... npx hardhat run scripts/upgrade.ts --network localhost
 */
import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("PROXY_ADDRESS environment variable is required");
  }

  console.log("Upgrading JpycSplitMarketplace at:", proxyAddress);

  const JpycSplitMarketplaceV2 = await ethers.getContractFactory("JpycSplitMarketplaceV2");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, JpycSplitMarketplaceV2, {
    kind: "uups",
  });
  await upgraded.waitForDeployment();

  console.log("JpycSplitMarketplace upgraded to V2 at:", await upgraded.getAddress());
}

main().catch(console.error);
