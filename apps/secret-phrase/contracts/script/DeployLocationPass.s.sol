// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {LocationPass} from "../src/LocationPass.sol";

/// @notice Deploy a single LocationPass contract for one city.
/// @dev Reads constructor args from environment variables so the same script
///      deploys SF, NYC, or any future city. Required env vars:
///        LP_NAME              ERC-721 collection name
///        LP_SYMBOL            ERC-721 symbol
///        LP_LOCATION_NAME     Human-readable city name (metadata trait)
///        LP_PASS_DISPLAY_NAME Display name shown on the NFT image
///      Plus the standard PRIVATE_KEY for broadcasting.
///
/// Example:
///   LP_NAME="Secret Phrase Manhattan Hub Pass" \
///   LP_SYMBOL="PHRASE-NYC" \
///   LP_LOCATION_NAME="New York City" \
///   LP_PASS_DISPLAY_NAME="MANHATTAN HUB PASS" \
///   PRIVATE_KEY=0x... \
///   forge script script/DeployLocationPass.s.sol:DeployLocationPass \
///     --rpc-url base_sepolia --broadcast --verify
contract DeployLocationPass is Script {
    function run() external returns (LocationPass deployed, uint256 deployBlock) {
        string memory name_ = vm.envString("LP_NAME");
        string memory symbol_ = vm.envString("LP_SYMBOL");
        string memory locationName_ = vm.envString("LP_LOCATION_NAME");
        string memory passDisplayName_ = vm.envString("LP_PASS_DISPLAY_NAME");

        require(bytes(name_).length > 0, "LP_NAME required");
        require(bytes(symbol_).length > 0, "LP_SYMBOL required");
        require(bytes(locationName_).length > 0, "LP_LOCATION_NAME required");
        require(bytes(passDisplayName_).length > 0, "LP_PASS_DISPLAY_NAME required");

        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        deployed = new LocationPass(name_, symbol_, locationName_, passDisplayName_);
        deployBlock = block.number;

        vm.stopBroadcast();

        // Emit a structured summary the operator can paste into
        // src/lib/locations.ts.
        console.log("---LocationPass deployed---");
        console.log("name:               ", name_);
        console.log("symbol:             ", symbol_);
        console.log("locationName:       ", locationName_);
        console.log("passDisplayName:    ", passDisplayName_);
        console.log("contractAddress:    ", address(deployed));
        console.log("deployBlock:        ", deployBlock);
        console.log("---");
    }
}
