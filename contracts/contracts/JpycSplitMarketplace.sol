// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract JpycSplitMarketplace is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {

    IERC20 public jpycToken;

    struct Split {
        address recipient;
        uint256 amount; // exact amount in wei
    }

    struct Product {
        uint256 price;
        bool isActive;
        Split[] splits;
    }

    mapping(uint256 => Product) public products;
    uint256 public nextProductId;

    event ProductRegistered(uint256 indexed productId, uint256 price);
    event ProductPriceUpdated(uint256 indexed productId, uint256 oldPrice, uint256 newPrice);
    event Purchase(uint256 indexed productId, address indexed buyer, uint256 price);
    event RevenueDistributed(uint256 indexed productId, address indexed recipient, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _jpycTokenAddress) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        jpycToken = IERC20(_jpycTokenAddress);
    }

    function registerProduct(
        uint256 _price,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external onlyOwner returns (uint256) {
        require(_recipients.length == _amounts.length, "Length mismatch");
        require(_recipients.length > 0, "No recipients");
        require(_price > 0, "Price must be > 0");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        require(totalAmount == _price, "Amounts must sum to price");

        uint256 productId = nextProductId++;
        Product storage p = products[productId];
        p.price = _price;
        p.isActive = true;

        for (uint256 i = 0; i < _recipients.length; i++) {
            p.splits.push(Split({
                recipient: _recipients[i],
                amount: _amounts[i]
            }));
        }

        emit ProductRegistered(productId, _price);
        return productId;
    }

    function updateProduct(
        uint256 _productId,
        uint256 _newPrice,
        uint256[] calldata _newAmounts
    ) external onlyOwner {
        require(_newPrice > 0, "Price must be > 0");
        Product storage p = products[_productId];
        require(p.isActive, "Product not active");
        require(_newAmounts.length == p.splits.length, "Length mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _newAmounts.length; i++) {
            totalAmount += _newAmounts[i];
        }
        require(totalAmount == _newPrice, "Amounts must sum to price");

        uint256 oldPrice = p.price;
        p.price = _newPrice;
        for (uint256 i = 0; i < _newAmounts.length; i++) {
            p.splits[i].amount = _newAmounts[i];
        }

        emit ProductPriceUpdated(_productId, oldPrice, _newPrice);
    }

    function buy(uint256 _productId) external virtual nonReentrant {
        Product storage p = products[_productId];
        require(p.isActive, "Product not active");

        uint256 price = p.price;

        require(jpycToken.transferFrom(msg.sender, address(this), price), "JPYC Transfer failed");

        uint256 distributed = 0;
        for (uint256 i = 0; i < p.splits.length; i++) {
            uint256 share;
            if (i == p.splits.length - 1) {
                // last recipient gets remainder to prevent dust
                share = price - distributed;
            } else {
                share = p.splits[i].amount;
            }
            if (share > 0) {
                distributed += share;
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
        uint256[] memory amounts
    ) {
        Product storage p = products[_productId];
        price = p.price;
        isActive = p.isActive;
        recipients = new address[](p.splits.length);
        amounts = new uint256[](p.splits.length);
        for (uint256 i = 0; i < p.splits.length; i++) {
            recipients[i] = p.splits[i].recipient;
            amounts[i] = p.splits[i].amount;
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    uint256[50] private __gap;
}
