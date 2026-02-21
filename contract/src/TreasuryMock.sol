// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TreasuryMock
/// @notice Mock treasury contract with token balances readable by CRE EVMClient
contract TreasuryMock {
    address public owner;
    mapping(address => uint256) public balances;

    event BalanceUpdated(address indexed token, uint256 newBalance);

    constructor() {
        owner = msg.sender;
        // Seed with 500,000 USDC (6 decimals)
        address baseSepoliaUsdc = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        balances[baseSepoliaUsdc] = 500_000 * 1e6;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Get token balance — called by CRE EVMClient.callContract()
    function getBalance(address token) external view returns (uint256) {
        return balances[token];
    }

    /// @notice Update balance for demo manipulation during presentations
    function setBalance(address token, uint256 amount) external onlyOwner {
        balances[token] = amount;
        emit BalanceUpdated(token, amount);
    }

    /// @notice Drain balance to simulate treasury alert scenario
    function drainBalance(address token) external onlyOwner {
        balances[token] = 0;
        emit BalanceUpdated(token, 0);
    }
}
