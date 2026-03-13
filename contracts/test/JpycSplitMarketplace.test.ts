import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("JpycSplitMarketplace", function () {
  async function deployFixture() {
    const [owner, recipient1, recipient2, buyer, nonOwner] =
      await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const jpyc = await MockERC20.deploy("JPY Coin", "JPYC", 18);
    await jpyc.waitForDeployment();

    const JpycSplitMarketplace = await ethers.getContractFactory(
      "JpycSplitMarketplace"
    );
    const marketplace = await upgrades.deployProxy(
      JpycSplitMarketplace,
      [await jpyc.getAddress()],
      { kind: "uups" }
    );
    await marketplace.waitForDeployment();

    const mintAmount = ethers.parseEther("100000");
    await jpyc.mint(buyer.address, mintAmount);

    return { marketplace, jpyc, owner, recipient1, recipient2, buyer, nonOwner };
  }

  describe("registerProduct", function () {
    it("should register a product with valid split amounts", async function () {
      const { marketplace, recipient1, recipient2 } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("800");
      const amount2 = ethers.parseEther("200");
      const tx = await marketplace.registerProduct(
        price,
        [recipient1.address, recipient2.address],
        [amount1, amount2]
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
      expect(product.amounts[0]).to.equal(amount1);
      expect(product.amounts[1]).to.equal(amount2);
    });

    it("should reject if amounts do not sum to price", async function () {
      const { marketplace, recipient1, recipient2 } =
        await loadFixture(deployFixture);

      await expect(
        marketplace.registerProduct(
          ethers.parseEther("1000"),
          [recipient1.address, recipient2.address],
          [ethers.parseEther("500"), ethers.parseEther("400")]
        )
      ).to.be.revertedWith("Amounts must sum to price");
    });

    it("should reject if recipients and amounts length mismatch", async function () {
      const { marketplace, recipient1 } = await loadFixture(deployFixture);

      await expect(
        marketplace.registerProduct(
          ethers.parseEther("1000"),
          [recipient1.address],
          [ethers.parseEther("500"), ethers.parseEther("500")]
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
            [ethers.parseEther("1000")]
          )
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });

    it("should assign sequential product IDs", async function () {
      const { marketplace, recipient1 } = await loadFixture(deployFixture);

      await marketplace.registerProduct(
        ethers.parseEther("1000"),
        [recipient1.address],
        [ethers.parseEther("1000")]
      );
      await marketplace.registerProduct(
        ethers.parseEther("2000"),
        [recipient1.address],
        [ethers.parseEther("2000")]
      );

      const p0 = await marketplace.getProduct(0);
      const p1 = await marketplace.getProduct(1);
      expect(p0.price).to.equal(ethers.parseEther("1000"));
      expect(p1.price).to.equal(ethers.parseEther("2000"));
      expect(await marketplace.nextProductId()).to.equal(2);
    });
  });

  describe("updateProduct", function () {
    it("should update price and amounts", async function () {
      const { marketplace, recipient1 } = await loadFixture(deployFixture);

      const oldPrice = ethers.parseEther("1000");
      const newPrice = ethers.parseEther("500");
      await marketplace.registerProduct(oldPrice, [recipient1.address], [oldPrice]);

      const tx = await marketplace.updateProduct(0, newPrice, [newPrice]);
      await expect(tx)
        .to.emit(marketplace, "ProductPriceUpdated")
        .withArgs(0, oldPrice, newPrice);

      const product = await marketplace.getProduct(0);
      expect(product.price).to.equal(newPrice);
      expect(product.amounts[0]).to.equal(newPrice);
    });

    it("should update price and split amounts for multiple recipients", async function () {
      const { marketplace, recipient1, recipient2 } = await loadFixture(deployFixture);

      const price = ethers.parseEther("140");
      await marketplace.registerProduct(
        price,
        [recipient1.address, recipient2.address],
        [ethers.parseEther("130"), ethers.parseEther("10")]
      );

      const newPrice = ethers.parseEther("200");
      await marketplace.updateProduct(0, newPrice, [ethers.parseEther("180"), ethers.parseEther("20")]);

      const product = await marketplace.getProduct(0);
      expect(product.price).to.equal(newPrice);
      expect(product.amounts[0]).to.equal(ethers.parseEther("180"));
      expect(product.amounts[1]).to.equal(ethers.parseEther("20"));
    });

    it("should reject if called by non-owner", async function () {
      const { marketplace, recipient1, nonOwner } = await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(price, [recipient1.address], [price]);

      await expect(
        marketplace.connect(nonOwner).updateProduct(0, ethers.parseEther("500"), [ethers.parseEther("500")])
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });

    it("should reject if product is not active", async function () {
      const { marketplace } = await loadFixture(deployFixture);

      await expect(
        marketplace.updateProduct(99, ethers.parseEther("500"), [ethers.parseEther("500")])
      ).to.be.revertedWith("Product not active");
    });

    it("should reject if new price is zero", async function () {
      const { marketplace, recipient1 } = await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(price, [recipient1.address], [price]);

      await expect(
        marketplace.updateProduct(0, 0, [0])
      ).to.be.revertedWith("Price must be > 0");
    });

    it("should reject if amounts length mismatch", async function () {
      const { marketplace, recipient1, recipient2 } = await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(
        price,
        [recipient1.address, recipient2.address],
        [ethers.parseEther("800"), ethers.parseEther("200")]
      );

      // 2 splits but only 1 amount
      await expect(
        marketplace.updateProduct(0, ethers.parseEther("500"), [ethers.parseEther("500")])
      ).to.be.revertedWith("Length mismatch");
    });

    it("should reject if amounts do not sum to new price", async function () {
      const { marketplace, recipient1 } = await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(price, [recipient1.address], [price]);

      await expect(
        marketplace.updateProduct(0, ethers.parseEther("500"), [ethers.parseEther("400")])
      ).to.be.revertedWith("Amounts must sum to price");
    });

    it("should allow buying at the new price after update", async function () {
      const { marketplace, jpyc, recipient1, buyer } = await loadFixture(deployFixture);

      const oldPrice = ethers.parseEther("1000");
      const newPrice = ethers.parseEther("500");
      await marketplace.registerProduct(oldPrice, [recipient1.address], [oldPrice]);

      await marketplace.updateProduct(0, newPrice, [newPrice]);

      await jpyc.connect(buyer).approve(await marketplace.getAddress(), newPrice);

      const r1Before = await jpyc.balanceOf(recipient1.address);
      await marketplace.connect(buyer).buy(0);

      expect(await jpyc.balanceOf(recipient1.address)).to.equal(r1Before + newPrice);
    });
  });

  describe("buy", function () {
    it("should distribute JPYC to recipients exactly", async function () {
      const { marketplace, jpyc, recipient1, recipient2, buyer } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("140");
      const amount1 = ethers.parseEther("130");
      const amount2 = ethers.parseEther("10");
      await marketplace.registerProduct(
        price,
        [recipient1.address, recipient2.address],
        [amount1, amount2]
      );

      await jpyc
        .connect(buyer)
        .approve(await marketplace.getAddress(), price);

      const r1BalBefore = await jpyc.balanceOf(recipient1.address);
      const r2BalBefore = await jpyc.balanceOf(recipient2.address);

      const tx = await marketplace.connect(buyer).buy(0);

      await expect(tx)
        .to.emit(marketplace, "Purchase")
        .withArgs(0, buyer.address, price);

      await expect(tx)
        .to.emit(marketplace, "RevenueDistributed")
        .withArgs(0, recipient1.address, amount1);

      await expect(tx)
        .to.emit(marketplace, "RevenueDistributed")
        .withArgs(0, recipient2.address, amount2);

      // Verify exact amounts
      expect(await jpyc.balanceOf(recipient1.address)).to.equal(r1BalBefore + amount1);
      expect(await jpyc.balanceOf(recipient2.address)).to.equal(r2BalBefore + amount2);

      // Contract should have 0 balance
      expect(await jpyc.balanceOf(await marketplace.getAddress())).to.equal(0);
    });

    it("should fail if product is not active", async function () {
      const { marketplace, buyer } = await loadFixture(deployFixture);

      await expect(
        marketplace.connect(buyer).buy(99)
      ).to.be.revertedWith("Product not active");
    });

    it("should fail if buyer has insufficient JPYC balance", async function () {
      const { marketplace, jpyc, recipient1, nonOwner } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(price, [recipient1.address], [price]);

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
      await marketplace.registerProduct(price, [recipient1.address], [price]);

      await jpyc
        .connect(buyer)
        .approve(await marketplace.getAddress(), ethers.parseEther("500"));

      await expect(
        marketplace.connect(buyer).buy(0)
      ).to.be.reverted;
    });

    it("should handle single recipient correctly", async function () {
      const { marketplace, jpyc, recipient1, buyer } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("500");
      await marketplace.registerProduct(price, [recipient1.address], [price]);

      await jpyc
        .connect(buyer)
        .approve(await marketplace.getAddress(), price);

      await marketplace.connect(buyer).buy(0);

      expect(await jpyc.balanceOf(recipient1.address)).to.equal(price);
    });
  });

  describe("UUPS Upgrade", function () {
    it("should reject re-initialization", async function () {
      const { marketplace, jpyc } = await loadFixture(deployFixture);

      await expect(
        marketplace.initialize(await jpyc.getAddress())
      ).to.be.revertedWithCustomError(marketplace, "InvalidInitialization");
    });

    it("should reject upgrade by non-owner", async function () {
      const { marketplace, nonOwner } = await loadFixture(deployFixture);

      const V2 = await ethers.getContractFactory("JpycSplitMarketplaceV2", nonOwner);
      await expect(
        upgrades.upgradeProxy(await marketplace.getAddress(), V2, { kind: "uups" })
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });

    it("should preserve state after upgrade", async function () {
      const { marketplace, jpyc, owner, recipient1 } = await loadFixture(deployFixture);

      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(price, [recipient1.address], [price]);

      const V2 = await ethers.getContractFactory("JpycSplitMarketplaceV2", owner);
      const upgraded = await upgrades.upgradeProxy(
        await marketplace.getAddress(),
        V2,
        { kind: "uups" }
      );

      expect(await upgraded.nextProductId()).to.equal(1);
      const product = await upgraded.getProduct(0);
      expect(product.price).to.equal(price);
      expect(product.isActive).to.be.true;
      expect(await upgraded.jpycToken()).to.equal(await jpyc.getAddress());
      expect(await upgraded.owner()).to.equal(owner.address);
    });

    it("should expose new V2 functions after upgrade", async function () {
      const { marketplace, owner } = await loadFixture(deployFixture);

      const V2 = await ethers.getContractFactory("JpycSplitMarketplaceV2", owner);
      const upgraded = await upgrades.upgradeProxy(
        await marketplace.getAddress(),
        V2,
        { kind: "uups" }
      );

      expect(await upgraded.version()).to.equal("2.0.0");
    });
  });
});
