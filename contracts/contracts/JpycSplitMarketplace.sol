// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract JpycSplitMarketplace is Ownable, ReentrancyGuard {

    IERC20 public immutable jpycToken;

    struct Split {
        address recipient;
        uint256 basisPoints; // 100% = 10000
    }

    struct Product {
        uint256 price;
        bool isActive;
        Split[] splits;
    }

    mapping(uint256 => Product) public products;
    uint256 public nextProductId;

    event ProductRegistered(uint256 indexed productId, uint256 price);
    event Purchase(uint256 indexed productId, address indexed buyer, uint256 price);
    event RevenueDistributed(uint256 indexed productId, address indexed recipient, uint256 amount);

    constructor(address _jpycTokenAddress) Ownable(msg.sender) {
        jpycToken = IERC20(_jpycTokenAddress);
    }

    function registerProduct(
        uint256 _price,
        address[] calldata _recipients,
        uint256[] calldata _basisPoints
    ) external onlyOwner returns (uint256) {
        require(_recipients.length == _basisPoints.length, "Length mismatch");
        require(_recipients.length > 0, "No recipients");

        uint256 totalBp = 0;
        for (uint256 i = 0; i < _basisPoints.length; i++) {
            totalBp += _basisPoints[i];
        }
        require(totalBp == 10000, "Total must be 100%");

        uint256 productId = nextProductId++;
        Product storage p = products[productId];
        p.price = _price;
        p.isActive = true;

        for (uint256 i = 0; i < _recipients.length; i++) {
            p.splits.push(Split({
                recipient: _recipients[i],
                basisPoints: _basisPoints[i]
            }));
        }

        emit ProductRegistered(productId, _price);
        return productId;
    }

    function buy(uint256 _productId) external nonReentrant {
        Product storage p = products[_productId];
        require(p.isActive, "Product not active");

        uint256 price = p.price;

        require(jpycToken.transferFrom(msg.sender, address(this), price), "JPYC Transfer failed");

        for (uint256 i = 0; i < p.splits.length; i++) {
            uint256 share = (price * p.splits[i].basisPoints) / 10000;
            if (share > 0) {
                require(jpycToken.transfer(p.splits[i].recipient, share), "Split transfer failed");
                emit RevenueDistributed(_productId, p.splits[i].recipient, share);
            }
        }

        emit Purchase(_productId, msg.sender, price);
    }

    function getProduct(uint256 _productId) external view returns (
        uint256 price,
        bool isActive,
        address[] memory recipients,
        uint256[] memory basisPoints
    ) {
        Product storage p = products[_productId];
        price = p.price;
        isActive = p.isActive;
        recipients = new address[](p.splits.length);
        basisPoints = new uint256[](p.splits.length);
        for (uint256 i = 0; i < p.splits.length; i++) {
            recipients[i] = p.splits[i].recipient;
            basisPoints[i] = p.splits[i].basisPoints;
        }
    }
}
