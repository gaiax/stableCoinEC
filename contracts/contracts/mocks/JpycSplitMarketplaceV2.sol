// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../JpycSplitMarketplace.sol";

/// @title JpycSplitMarketplaceV2 - テスト用V2
contract JpycSplitMarketplaceV2 is JpycSplitMarketplace {
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
