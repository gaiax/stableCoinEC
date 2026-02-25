// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../JpycSplitMarketplace.sol";

/// @title JpycSplitMarketplaceV2 - 小数点2桁対応
/// @notice 価格を100倍スケールで保存し、小数点以下2桁の価格設定を可能にする。
/// 例: 1000.50 JPYC → stored price = parseEther("1000.50") * 100
///     buy() 時に /100 して実際の転送額を算出する。
contract JpycSplitMarketplaceV2 is JpycSplitMarketplace {
    uint256 public constant PRICE_MULTIPLIER = 100;

    mapping(uint256 => bool) public priceMigrated;

    function version() external pure returns (string memory) {
        return "2.0.0";
    }

    /// @notice 既存商品の価格をV2形式（100倍スケール）に移行
    function migrateProductPrice(uint256 _productId) external onlyOwner {
        require(!priceMigrated[_productId], "Already migrated");
        require(products[_productId].isActive, "Product not active");
        products[_productId].price = products[_productId].price * PRICE_MULTIPLIER;
        priceMigrated[_productId] = true;
    }

    /// @notice V2の実際のJPYC転送額を取得
    function getActualPrice(uint256 _productId) external view returns (uint256) {
        return products[_productId].price / PRICE_MULTIPLIER;
    }

    /// @notice V2の購入（100倍スケール価格 → /100 して実際のJPYCを転送）
    function buy(uint256 _productId) external override nonReentrant {
        Product storage p = products[_productId];
        require(p.isActive, "Product not active");

        uint256 actualPrice = p.price / PRICE_MULTIPLIER;

        require(jpycToken.transferFrom(msg.sender, address(this), actualPrice), "JPYC Transfer failed");

        for (uint256 i = 0; i < p.splits.length; i++) {
            uint256 share = (actualPrice * p.splits[i].basisPoints) / 10000;
            if (share > 0) {
                require(jpycToken.transfer(p.splits[i].recipient, share), "Split transfer failed");
                emit RevenueDistributed(_productId, p.splits[i].recipient, share);
            }
        }

        emit Purchase(_productId, msg.sender, actualPrice);
    }
}
