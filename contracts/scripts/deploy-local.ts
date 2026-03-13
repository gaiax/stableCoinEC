/**
 * ローカル開発用デプロイスクリプト
 *
 * 1. MockERC20 (JPYC代替) をデプロイ
 * 2. JpycSplitMarketplace をUUPS Proxyでデプロイ
 * 3. テストアカウントにJPYCをミント
 * 4. サンプル商品を登録
 *
 * 使い方:
 *   npx hardhat run scripts/deploy-local.ts --network localhost
 */
import { ethers, upgrades } from "hardhat";
import { PrismaClient } from "@prisma/client";

async function main() {
  // Hardhat再起動でオンチェーンデータがリセットされるため、DBの古いonChainProductIdをクリア
  const prisma = new PrismaClient();
  try {
    const result = await prisma.product.updateMany({
      where: { onChainProductId: { not: null } },
      data: { onChainProductId: null, txHash: null },
    });
    if (result.count > 0) {
      console.log(`🔄 DB: Reset onChainProductId for ${result.count} products`);
    }
  } catch {
    // DB接続失敗は無視（DBなしでもデプロイ可能）
  } finally {
    await prisma.$disconnect();
  }

  const [owner, seller, buyer] = await ethers.getSigners();
  console.log("=".repeat(50));
  console.log("Deploying to local Hardhat Node");
  console.log("Owner   :", owner.address);
  console.log("Seller  :", seller.address);
  console.log("Buyer   :", buyer.address);
  console.log("=".repeat(50));

  // 1. MockERC20 (JPYCの代替) をデプロイ
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockJpyc = await MockERC20.deploy("JPY Coin", "JPYC", 18);
  await mockJpyc.waitForDeployment();
  const mockJpycAddress = await mockJpyc.getAddress();
  console.log("\n✅ MockJPYC deployed to:", mockJpycAddress);

  // 2. JpycSplitMarketplace をUUPS Proxyでデプロイ
  const JpycSplitMarketplace = await ethers.getContractFactory("JpycSplitMarketplace");
  const marketplace = await upgrades.deployProxy(
    JpycSplitMarketplace,
    [mockJpycAddress],
    { kind: "uups" }
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace (Proxy) deployed to:", marketplaceAddress);

  // 3. テストアカウントにJPYCをミント
  const mintAmount = ethers.parseEther("100000"); // 100,000 JPYC
  await mockJpyc.mint(buyer.address, mintAmount);
  await mockJpyc.mint(seller.address, mintAmount);
  console.log("\n💰 Minted 100,000 JPYC to:");
  console.log("   Buyer  :", buyer.address);
  console.log("   Seller :", seller.address);

  // 4. サンプル商品を登録 (Admin = owner が実行)
  const price = ethers.parseEther("1000"); // 1,000 JPYC
  const tx1 = await marketplace.registerProduct(
    price,
    [seller.address],
    [price] // 全額 seller
  );
  await tx1.wait();

  const price2 = ethers.parseEther("500"); // 500 JPYC
  const tx2 = await marketplace.registerProduct(
    price2,
    [seller.address, owner.address],
    [ethers.parseEther("350"), ethers.parseEther("150")] // 350 seller, 150 owner
  );
  await tx2.wait();

  console.log("\n📦 Sample products registered:");
  console.log("   Product #0: 1,000 JPYC → seller 1,000");
  console.log("   Product #1: 500 JPYC → seller 350 / owner 150");

  // 5. .env.local 用の出力
  console.log("\n" + "=".repeat(50));
  console.log("📋 Add to .env.local:");
  console.log("=".repeat(50));
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS="${marketplaceAddress}"`);
  console.log(`NEXT_PUBLIC_JPYC_ADDRESS="${mockJpycAddress}"`);
  console.log(`ADMIN_PRIVATE_KEY="${(owner as any).privateKey || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"}"`);
  console.log("=".repeat(50));
  console.log("\n🔑 Test accounts (Hardhat default private keys):");
  console.log(`   Owner/Admin : ${owner.address}`);
  console.log(`   Private Key : 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  console.log(`   Buyer       : ${buyer.address}`);
  console.log(`   Private Key : 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
