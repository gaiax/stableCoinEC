import { ethers, upgrades } from "hardhat";

async function main() {
  const jpycAddress =
    process.env.NEXT_PUBLIC_JPYC_ADDRESS ||
    "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB";

  const JpycSplitMarketplace =
    await ethers.getContractFactory("JpycSplitMarketplace");
  const marketplace = await upgrades.deployProxy(
    JpycSplitMarketplace,
    [jpycAddress],
    { kind: "uups" }
  );
  await marketplace.waitForDeployment();

  const address = await marketplace.getAddress();
  console.log(`JpycSplitMarketplace (Proxy) deployed to: ${address}`);
  console.log(`Set NEXT_PUBLIC_CONTRACT_ADDRESS=${address} in .env.local`);
}

main().catch(console.error);
