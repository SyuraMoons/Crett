// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AlertRegistry} from "../src/AlertRegistry.sol";
import {TreasuryMock} from "../src/TreasuryMock.sol";
import {RiskLog} from "../src/RiskLog.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        AlertRegistry alertRegistry = new AlertRegistry();
        TreasuryMock treasuryMock = new TreasuryMock();
        RiskLog riskLog = new RiskLog();

        vm.stopBroadcast();

        console.log("AlertRegistry:", address(alertRegistry));
        console.log("TreasuryMock:", address(treasuryMock));
        console.log("RiskLog:", address(riskLog));

        // Write addresses to JSON for use in workflow config + dashboard
        string memory json = string.concat(
            '{\n',
            '  "network": "base-sepolia",\n',
            '  "AlertRegistry": "', vm.toString(address(alertRegistry)), '",\n',
            '  "TreasuryMock": "', vm.toString(address(treasuryMock)), '",\n',
            '  "RiskLog": "', vm.toString(address(riskLog)), '"\n',
            '}'
        );
        vm.writeFile("deployed-addresses.json", json);
        console.log("Addresses written to deployed-addresses.json");
    }
}
