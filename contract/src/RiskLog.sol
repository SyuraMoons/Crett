// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/// @title RiskLog
/// @notice Onchain risk event log written by CRE workflows via writeReport()
contract RiskLog is IReceiver {
    struct LogEntry {
        string category;
        uint8 severity; // 1 (low) to 5 (critical)
        string message;
        uint256 timestamp;
    }

    LogEntry[] public entries;

    event RiskLogged(string indexed category, uint8 severity, string message, uint256 timestamp);

    /// @notice Called by Chainlink KeystoneForwarder when a CRE workflow writes onchain
    function onReport(bytes calldata /*metadata*/, bytes calldata report) external override {
        (string memory category, uint8 severity, string memory message) =
            abi.decode(report, (string, uint8, string));
        _log(category, severity, message);
    }

    /// @notice Direct log call for testing
    function logRisk(string calldata category, uint8 severity, string calldata message) external {
        require(severity >= 1 && severity <= 5, "Severity must be 1-5");
        _log(category, severity, message);
    }

    function _log(string memory category, uint8 severity, string memory message) internal {
        entries.push(LogEntry(category, severity, message, block.timestamp));
        emit RiskLogged(category, severity, message, block.timestamp);
    }

    function getLogCount() external view returns (uint256) {
        return entries.length;
    }

    function getLatestEntry() external view returns (LogEntry memory) {
        require(entries.length > 0, "No entries");
        return entries[entries.length - 1];
    }

    function getEntry(uint256 index) external view returns (LogEntry memory) {
        require(index < entries.length, "Index out of bounds");
        return entries[index];
    }
}
