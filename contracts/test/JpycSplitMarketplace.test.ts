import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("JpycSplitMarketplace", function () {
  async function deployFixture() {
    const [owner, recipient1, recipient2, buyer, nonOwner] =
      await ethers.getSigners();

    // Deploy a mock ERC20 token to act as JPYC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const jpyc = await MockERC20.deploy("JPY Coin", "JPYC", 18);
    await jpyc.waitForDeployment();

    // Deploy the marketplace
    const JpycSplitMarketplace = await ethers.getContractFactory(
      "JpycSplitMarketplace"
    );
    const marketplace = await JpycSplitMarketplace.deploy(
      await jpyc.getAddress()
    );
    await marketplace.waitForDeployment();

    // Mint JPYC to buyer
    const mintAmount = ethers.parseEther("100000");
    await jpyc.mint(buyer.address, mintAmount);

    return { marketplace, jpyc, owner, recipient1, recipient2, buyer, nonOwner };
  }

  describe("registerProduct", function () {
    it("should register a product with valid splits", async function () {
      const { marketplace, recipient1, recipient2 } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      const tx = await marketplace.registerProduct(
        price,
        [recipient1.address, recipient2.address],
        [8000, 2000]
      );

      await expect(tx)
        .to.emit(marketplace, "ProductRegistered")
        .withArgs(0, price);

      const product = await marketplace.getProduct(0);
      expect(product.price).to.equal(price);
      expect(product.isActive).to.be.true;
      expect(product.recipients).to.deep.equal([
        recipient1.address,
        recipient2.address,
      ]);
      expect(product.basisPoints.map((bp: bigint) => Number(bp))).to.deep.equal([8000, 2000]);
    });

    it("should reject if total basis points != 10000", async function () {
      const { marketplace, recipient1, recipient2 } =
        await loadFixture(deployFixture);

      await expect(
        marketplace.registerProduct(
          ethers.parseEther("1000"),
          [recipient1.address, recipient2.address],
          [5000, 4000]
        )
      ).to.be.revertedWith("Total must be 100%");
    });

    it("should reject if recipients and basisPoints length mismatch", async function () {
      const { marketplace, recipient1 } = await loadFixture(deployFixture);

      await expect(
        marketplace.registerProduct(
          ethers.parseEther("1000"),
          [recipient1.address],
          [5000, 5000]
        )
      ).to.be.revertedWith("Length mismatch");
    });

    it("should reject if no recipients", async function () {
      const { marketplace } = await loadFixture(deployFixture);

      await expect(
        marketplace.registerProduct(ethers.parseEther("1000"), [], [])
      ).to.be.revertedWith("No recipients");
    });

    it("should only allow owner to register", async function () {
      const { marketplace, nonOwner, recipient1 } =
        await loadFixture(deployFixture);

      await expect(
        marketplace
          .connect(nonOwner)
          .registerProduct(
            ethers.parseEther("1000"),
            [recipient1.address],
            [10000]
          )
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });

    it("should assign sequential product IDs", async function () {
      const { marketplace, recipient1 } = await loadFixture(deployFixture);

      await marketplace.registerProduct(
        ethers.parseEther("1000"),
        [recipient1.address],
        [10000]
      );
      await marketplace.registerProduct(
        ethers.parseEther("2000"),
        [recipient1.address],
        [10000]
      );

      const p0 = await marketplace.getProduct(0);
      const p1 = await marketplace.getProduct(1);
      expect(p0.price).to.equal(ethers.parseEther("1000"));
      expect(p1.price).to.equal(ethers.parseEther("2000"));
      expect(await marketplace.nextProductId()).to.equal(2);
    });
  });

  describe("buy", function () {
    it("should distribute JPYC to recipients correctly", async function () {
      const { marketplace, jpyc, recipient1, recipient2, buyer } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(
        price,
        [recipient1.address, recipient2.address],
        [8000, 2000]
      );

      // Approve marketplace to spend buyer's JPYC
      await jpyc
        .connect(buyer)
        .approve(await marketplace.getAddress(), price);

      const r1BalBefore = await jpyc.balanceOf(recipient1.address);
      const r2BalBefore = await jpyc.balanceOf(recipient2.address);
      const buyerBalBefore = await jpyc.balanceOf(buyer.address);

      const tx = await marketplace.connect(buyer).buy(0);

      await expect(tx)
        .to.emit(marketplace, "Purchase")
        .withArgs(0, buyer.address, price);

      await expect(tx)
        .to.emit(marketplace, "RevenueDistributed")
        .withArgs(0, recipient1.address, ethers.parseEther("800"));

      await expect(tx)
        .to.emit(marketplace, "RevenueDistributed")
        .withArgs(0, recipient2.address, ethers.parseEther("200"));

      // Verify balances
      expect(await jpyc.balanceOf(recipient1.address)).to.equal(
        r1BalBefore + ethers.parseEther("800")
      );
      expect(await jpyc.balanceOf(recipient2.address)).to.equal(
        r2BalBefore + ethers.parseEther("200")
      );
      expect(await jpyc.balanceOf(buyer.address)).to.equal(
        buyerBalBefore - price
      );

      // Contract should have 0 balance (all distributed)
      expect(await jpyc.balanceOf(await marketplace.getAddress())).to.equal(0);
    });

    it("should fail if product is not active", async function () {
      const { marketplace, buyer } = await loadFixture(deployFixture);

      // Product 99 was never registered
      await expect(
        marketplace.connect(buyer).buy(99)
      ).to.be.revertedWith("Product not active");
    });

    it("should fail if buyer has insufficient JPYC balance", async function () {
      const { marketplace, jpyc, recipient1, nonOwner } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(
        price,
        [recipient1.address],
        [10000]
      );

      // nonOwner has 0 JPYC but approves
      await jpyc
        .connect(nonOwner)
        .approve(await marketplace.getAddress(), price);

      await expect(
        marketplace.connect(nonOwner).buy(0)
      ).to.be.reverted;
    });

    it("should fail if buyer has not approved enough JPYC", async function () {
      const { marketplace, jpyc, recipient1, buyer } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(
        price,
        [recipient1.address],
        [10000]
      );

      // Approve less than price
      await jpyc
        .connect(buyer)
        .approve(await marketplace.getAddress(), ethers.parseEther("500"));

      await expect(
        marketplace.connect(buyer).buy(0)
      ).to.be.reverted;
    });

    it("should handle single recipient (100%) correctly", async function () {
      const { marketplace, jpyc, recipient1, buyer } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("500");
      await marketplace.registerProduct(
        price,
        [recipient1.address],
        [10000]
      );

      await jpyc
        .connect(buyer)
        .approve(await marketplace.getAddress(), price);

      await marketplace.connect(buyer).buy(0);

      expect(await jpyc.balanceOf(recipient1.address)).to.equal(price);
    });
  });
});
