// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/// @title AlertRegistry
/// @notice Stores price alert events written by CRE workflows via writeReport()
contract AlertRegistry is IReceiver {
    struct Alert {
        string symbol;
        int256 price;
        uint256 timestamp;
    }

    Alert[] public alerts;

    event AlertRecorded(string indexed symbol, int256 price, uint256 timestamp);

    /// @notice Called by Chainlink KeystoneForwarder when a CRE workflow writes onchain
    function onReport(bytes calldata /*metadata*/, bytes calldata report) external override {
        (string memory symbol, int256 price) = abi.decode(report, (string, int256));
        alerts.push(Alert(symbol, price, block.timestamp));
        emit AlertRecorded(symbol, price, block.timestamp);
    }

    function getAlertCount() external view returns (uint256) {
        return alerts.length;
    }

    function getLatestAlert() external view returns (Alert memory) {
        require(alerts.length > 0, "No alerts recorded");
        return alerts[alerts.length - 1];
    }

    function getAlert(uint256 index) external view returns (Alert memory) {
        require(index < alerts.length, "Index out of bounds");
        return alerts[index];
    }
}
