import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("JpycSplitMarketplace", function () {
  async function deployFixture() {
    const [owner, recipient1, recipient2, buyer, nonOwner] =
      await ethers.getSigners();

    // Deploy a mock ERC20 token to act as JPYC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const jpyc = await MockERC20.deploy("JPY Coin", "JPYC", 18);
    await jpyc.waitForDeployment();

    // Deploy the marketplace via UUPS Proxy
    const JpycSplitMarketplace = await ethers.getContractFactory(
      "JpycSplitMarketplace"
    );
    const marketplace = await upgrades.deployProxy(
      JpycSplitMarketplace,
      [await jpyc.getAddress()],
      { kind: "uups" }
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

      // Register a product before upgrade
      const price = ethers.parseEther("1000");
      await marketplace.registerProduct(price, [recipient1.address], [10000]);

      // Upgrade to V2
      const V2 = await ethers.getContractFactory("JpycSplitMarketplaceV2", owner);
      const upgraded = await upgrades.upgradeProxy(
        await marketplace.getAddress(),
        V2,
        { kind: "uups" }
      );

      // Verify state is preserved
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

  describe("V2 Decimal Price", function () {
    // V2の価格スケール:
    //   stored price = 実際のJPYC額(wei) × 100
    //   buy() 時に /100 して実際の転送額を算出
    //   例: 1000 JPYC → stored = parseEther("1000") * 100 = parseEther("100000")
    //       10.50 JPYC → stored = parseEther("10.5") * 100 = parseEther("1050")

    async function deployAndUpgradeFixture() {
      const [owner, recipient1, recipient2, buyer, nonOwner] =
        await ethers.getSigners();

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const jpyc = await MockERC20.deploy("JPY Coin", "JPYC", 18);
      await jpyc.waitForDeployment();

      // V1でデプロイし、商品を登録
      const V1 = await ethers.getContractFactory("JpycSplitMarketplace");
      const proxy = await upgrades.deployProxy(
        V1,
        [await jpyc.getAddress()],
        { kind: "uups" }
      );
      await proxy.waitForDeployment();

      // V1商品: 1000 JPYC (80% recipient1, 20% recipient2)
      const v1Price = ethers.parseEther("1000");
      await proxy.registerProduct(
        v1Price,
        [recipient1.address, recipient2.address],
        [8000, 2000]
      );

      // V2にアップグレード
      const V2 = await ethers.getContractFactory("JpycSplitMarketplaceV2", owner);
      const upgraded = await upgrades.upgradeProxy(
        await proxy.getAddress(),
        V2,
        { kind: "uups" }
      );

      // buyerにJPYCをミント
      await jpyc.mint(buyer.address, ethers.parseEther("100000"));

      return { upgraded, jpyc, owner, recipient1, recipient2, buyer, nonOwner, v1Price };
    }

    it("should migrate old product price (×100)", async function () {
      const { upgraded, v1Price } = await loadFixture(deployAndUpgradeFixture);

      // 移行前: V1の価格がそのまま保存されている
      const before = await upgraded.getProduct(0);
      expect(before.price).to.equal(v1Price);

      // 移行実行
      await upgraded.migrateProductPrice(0);

      // 移行後: 価格が100倍になっている
      const after = await upgraded.getProduct(0);
      expect(after.price).to.equal(v1Price * 100n);

      // getActualPrice() で元の額を取得できる
      expect(await upgraded.getActualPrice(0)).to.equal(v1Price);
    });

    it("should reject double migration", async function () {
      const { upgraded } = await loadFixture(deployAndUpgradeFixture);

      await upgraded.migrateProductPrice(0);
      await expect(
        upgraded.migrateProductPrice(0)
      ).to.be.revertedWith("Already migrated");
    });

    it("should buy migrated product with correct JPYC transfer", async function () {
      const { upgraded, jpyc, recipient1, recipient2, buyer, v1Price } =
        await loadFixture(deployAndUpgradeFixture);

      // 旧商品を移行
      await upgraded.migrateProductPrice(0);

      // buyer が approve（実際の転送額 = v1Price = 1000 JPYC）
      await jpyc.connect(buyer).approve(await upgraded.getAddress(), v1Price);

      const r1Before = await jpyc.balanceOf(recipient1.address);
      const r2Before = await jpyc.balanceOf(recipient2.address);
      const buyerBefore = await jpyc.balanceOf(buyer.address);

      // V2のbuy() → stored price / 100 = 1000 JPYC を転送
      await upgraded.connect(buyer).buy(0);

      // 1000 JPYC の 80% = 800, 20% = 200
      expect(await jpyc.balanceOf(recipient1.address)).to.equal(
        r1Before + ethers.parseEther("800")
      );
      expect(await jpyc.balanceOf(recipient2.address)).to.equal(
        r2Before + ethers.parseEther("200")
      );
      expect(await jpyc.balanceOf(buyer.address)).to.equal(
        buyerBefore - v1Price
      );
    });

    it("should register and buy new product with decimal price (10.50 JPYC)", async function () {
      const { upgraded, jpyc, recipient1, buyer } =
        await loadFixture(deployAndUpgradeFixture);

      // V2で新商品登録: 10.50 JPYC = parseEther("10.5") * 100
      const decimalPrice = ethers.parseEther("10.5");
      const scaledPrice = decimalPrice * 100n; // = parseEther("1050")
      await upgraded.registerProduct(
        scaledPrice,
        [recipient1.address],
        [10000]
      );

      // getActualPrice で 10.50 JPYC を確認
      expect(await upgraded.getActualPrice(1)).to.equal(decimalPrice);

      // 購入（実際の転送額 = 10.50 JPYC）
      await jpyc.connect(buyer).approve(await upgraded.getAddress(), decimalPrice);

      const r1Before = await jpyc.balanceOf(recipient1.address);
      const buyerBefore = await jpyc.balanceOf(buyer.address);

      await upgraded.connect(buyer).buy(1);

      // recipient1 に 10.50 JPYC が転送される
      expect(await jpyc.balanceOf(recipient1.address)).to.equal(
        r1Before + decimalPrice
      );
      expect(await jpyc.balanceOf(buyer.address)).to.equal(
        buyerBefore - decimalPrice
      );
    });

    it("should handle both migrated and new products consistently", async function () {
      const { upgraded, jpyc, recipient1, recipient2, buyer, v1Price } =
        await loadFixture(deployAndUpgradeFixture);

      // 旧商品(#0)を移行
      await upgraded.migrateProductPrice(0);

      // 新商品(#1)を登録: 500.75 JPYC
      const newDecimalPrice = ethers.parseEther("500.75");
      const newScaledPrice = newDecimalPrice * 100n;
      await upgraded.registerProduct(
        newScaledPrice,
        [recipient1.address, recipient2.address],
        [6000, 4000] // 60% / 40%
      );

      // 両方の getActualPrice を確認
      expect(await upgraded.getActualPrice(0)).to.equal(v1Price);              // 1000 JPYC
      expect(await upgraded.getActualPrice(1)).to.equal(newDecimalPrice);      // 500.75 JPYC

      // 旧商品を購入
      const totalApproval = v1Price + newDecimalPrice;
      await jpyc.connect(buyer).approve(await upgraded.getAddress(), totalApproval);

      const buyerBefore = await jpyc.balanceOf(buyer.address);

      await upgraded.connect(buyer).buy(0); // 1000 JPYC

      // 新商品を購入
      await upgraded.connect(buyer).buy(1); // 500.75 JPYC

      // buyer の残高が正しく減っている
      expect(await jpyc.balanceOf(buyer.address)).to.equal(
        buyerBefore - v1Price - newDecimalPrice
      );

      // コントラクトに残高が残っていない（全額分配済み）
      expect(await jpyc.balanceOf(await upgraded.getAddress())).to.equal(0);
    });
  });
});
