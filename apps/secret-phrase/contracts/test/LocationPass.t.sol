// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {LocationPass} from "../src/LocationPass.sol";

contract LocationPassTest is Test {
    LocationPass internal pass;

    string internal constant NAME = "Secret Phrase Manhattan Hub Pass";
    string internal constant SYMBOL = "PHRASE-NYC";
    string internal constant LOCATION_NAME = "New York City";
    string internal constant PASS_DISPLAY_NAME = "MANHATTAN HUB PASS";

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        pass = new LocationPass(NAME, SYMBOL, LOCATION_NAME, PASS_DISPLAY_NAME);
    }

    // ─── Constructor ────────────────────────────────────────────────────────

    function test_constructor_setsName() public view {
        assertEq(pass.name(), NAME);
    }

    function test_constructor_setsSymbol() public view {
        assertEq(pass.symbol(), SYMBOL);
    }

    function test_constructor_setsLocationName() public view {
        assertEq(pass.locationName(), LOCATION_NAME);
    }

    function test_constructor_setsPassDisplayName() public view {
        assertEq(pass.passDisplayName(), PASS_DISPLAY_NAME);
    }

    // ─── mint / hasMinted ──────────────────────────────────────────────────

    function test_mint_succeedsForNewAddress() public {
        pass.mint(alice);
        assertEq(pass.balanceOf(alice), 1);
        assertEq(pass.ownerOf(0), alice);
    }

    function test_mint_revertsOnRepeat() public {
        pass.mint(alice);
        vm.expectRevert(bytes("Already minted"));
        pass.mint(alice);
    }

    function test_hasMinted_falseBeforeMint() public view {
        assertFalse(pass.hasMinted(alice));
    }

    function test_hasMinted_trueAfterMint() public {
        pass.mint(alice);
        assertTrue(pass.hasMinted(alice));
    }

    function test_hasMinted_isPerAddress() public {
        pass.mint(alice);
        assertTrue(pass.hasMinted(alice));
        assertFalse(pass.hasMinted(bob));
    }

    // ─── totalSupply ────────────────────────────────────────────────────────

    function test_totalSupply_startsAtZero() public view {
        assertEq(pass.totalSupply(), 0);
    }

    function test_totalSupply_incrementsOnMint() public {
        pass.mint(alice);
        assertEq(pass.totalSupply(), 1);
        pass.mint(bob);
        assertEq(pass.totalSupply(), 2);
    }

    function test_tokenIds_startAtZeroAndIncrementSequentially() public {
        pass.mint(alice);
        pass.mint(bob);
        assertEq(pass.ownerOf(0), alice);
        assertEq(pass.ownerOf(1), bob);
    }

    // ─── tokenURI ───────────────────────────────────────────────────────────

    function test_tokenURI_returnsDataUri() public {
        pass.mint(alice);
        string memory uri = pass.tokenURI(0);
        // Starts with the base64-encoded application/json data URI prefix.
        assertEq(_substring(uri, 0, 29), "data:application/json;base64,");
    }

    function test_tokenURI_jsonContainsLocationName() public {
        pass.mint(alice);
        string memory uri = pass.tokenURI(0);
        string memory json = _decodeBase64Suffix(uri, 29);
        assertTrue(_contains(json, LOCATION_NAME), "tokenURI JSON must include locationName");
    }

    function test_tokenURI_jsonContainsCollectionName() public {
        pass.mint(alice);
        string memory uri = pass.tokenURI(0);
        string memory json = _decodeBase64Suffix(uri, 29);
        assertTrue(_contains(json, NAME), "tokenURI JSON must include collection name");
    }

    function test_tokenURI_jsonContainsTokenId() public {
        pass.mint(alice);
        pass.mint(bob);
        string memory uri = pass.tokenURI(1);
        string memory json = _decodeBase64Suffix(uri, 29);
        assertTrue(_contains(json, "#1"), "tokenURI JSON must include the token id");
    }

    // ─── Fuzz / property tests ──────────────────────────────────────────────

    function testFuzz_anyAddressCanMintExactlyOnce(address recipient) public {
        vm.assume(recipient != address(0));
        vm.assume(recipient.code.length == 0); // avoid contracts that reject ERC721Received

        pass.mint(recipient);
        assertTrue(pass.hasMinted(recipient));
        assertEq(pass.balanceOf(recipient), 1);

        vm.expectRevert(bytes("Already minted"));
        pass.mint(recipient);
    }

    function testFuzz_totalSupplyEqualsMintCount(uint8 mintCount) public {
        vm.assume(mintCount > 0);
        for (uint256 i = 0; i < mintCount; i++) {
            address recipient = address(uint160(0x1000 + i));
            pass.mint(recipient);
        }
        assertEq(pass.totalSupply(), mintCount);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    function _substring(string memory str, uint256 start, uint256 length)
        internal
        pure
        returns (string memory)
    {
        bytes memory s = bytes(str);
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = s[start + i];
        }
        return string(result);
    }

    function _decodeBase64Suffix(string memory dataUri, uint256 prefixLen)
        internal
        pure
        returns (string memory)
    {
        bytes memory full = bytes(dataUri);
        bytes memory b64 = new bytes(full.length - prefixLen);
        for (uint256 i = 0; i < b64.length; i++) {
            b64[i] = full[prefixLen + i];
        }
        return string(_decodeBase64(b64));
    }

    /// @dev Minimal base64 decoder for test assertions only. Not constant-time,
    ///      not gas-optimized — fine for off-chain test execution.
    function _decodeBase64(bytes memory data) internal pure returns (bytes memory) {
        bytes memory table = bytes("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
        uint256[] memory rev = new uint256[](256);
        for (uint256 i = 0; i < table.length; i++) {
            rev[uint8(table[i])] = i;
        }

        uint256 padCount = 0;
        if (data.length >= 1 && data[data.length - 1] == "=") padCount++;
        if (data.length >= 2 && data[data.length - 2] == "=") padCount++;

        uint256 outLen = (data.length / 4) * 3 - padCount;
        bytes memory out = new bytes(outLen);
        uint256 outIdx = 0;

        for (uint256 i = 0; i < data.length; i += 4) {
            uint256 a = rev[uint8(data[i])];
            uint256 b = rev[uint8(data[i + 1])];
            uint256 c = data[i + 2] == "=" ? 0 : rev[uint8(data[i + 2])];
            uint256 d = data[i + 3] == "=" ? 0 : rev[uint8(data[i + 3])];

            uint256 triple = (a << 18) | (b << 12) | (c << 6) | d;

            if (outIdx < outLen) out[outIdx++] = bytes1(uint8(triple >> 16));
            if (outIdx < outLen) out[outIdx++] = bytes1(uint8(triple >> 8));
            if (outIdx < outLen) out[outIdx++] = bytes1(uint8(triple));
        }
        return out;
    }

    function _contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length > h.length) return false;
        for (uint256 i = 0; i <= h.length - n.length; i++) {
            bool ok = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    }
}
