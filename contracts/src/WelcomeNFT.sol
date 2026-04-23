// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract WelcomeNFT is ERC721 {
    using Strings for uint256;

    uint256 private _nextTokenId;
    mapping(address => bool) public hasMinted;

    constructor() ERC721("Secret Stairs Welcome Pass", "STAIRS") {}

    function mint(address to) external {
        require(!hasMinted[to], "Already minted");
        hasMinted[to] = true;

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function tokenURI(uint256 tokenId) public pure override returns (string memory) {
        string memory tokenStr = tokenId.toString();
        string memory svg = _generateSVG(tokenStr);

        string memory json = string(
            abi.encodePacked(
                '{"name":"Secret Stairs #',
                tokenStr,
                '","description":"Found the secret stairs at Coinbase HQ. A gasless Welcome Pass minted on Base.","image":"data:image/svg+xml;base64,',
                Base64.encode(bytes(svg)),
                '","attributes":[{"trait_type":"Location","value":"Coinbase HQ"},{"trait_type":"Pass Type","value":"Welcome"},{"trait_type":"Network","value":"Base"}]}'
            )
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    function _generateSVG(string memory tokenStr) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
                '<defs>',
                '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
                '<stop offset="0%" stop-color="#050A14"/>',
                '<stop offset="100%" stop-color="#0A1628"/>',
                '</linearGradient>',
                '<linearGradient id="stair" x1="0" y1="0" x2="0" y2="1">',
                '<stop offset="0%" stop-color="#0052FF"/>',
                '<stop offset="100%" stop-color="#003FCC"/>',
                '</linearGradient>',
                '</defs>',
                '<rect width="400" height="400" rx="20" fill="url(#bg)"/>',
                '<rect x="12" y="12" width="376" height="376" rx="14" fill="none" stroke="#0052FF" stroke-width="1" opacity="0.3"/>',
                _generateStairs(),
                _generateText(tokenStr),
                '</svg>'
            )
        );
    }

    function _generateStairs() internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<rect x="60" y="280" width="60" height="40" rx="4" fill="url(#stair)" opacity="0.3"/>',
                '<rect x="110" y="240" width="60" height="80" rx="4" fill="url(#stair)" opacity="0.45"/>',
                '<rect x="160" y="200" width="60" height="120" rx="4" fill="url(#stair)" opacity="0.6"/>',
                '<rect x="210" y="160" width="60" height="160" rx="4" fill="url(#stair)" opacity="0.75"/>',
                '<rect x="260" y="120" width="60" height="200" rx="4" fill="url(#stair)" opacity="0.9"/>',
                '<line x1="60" y1="320" x2="320" y2="320" stroke="#3380FF" stroke-width="1" opacity="0.15"/>'
            )
        );
    }

    function _generateText(string memory tokenStr) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<text x="200" y="60" text-anchor="middle" fill="#3380FF" font-size="11" font-family="monospace" letter-spacing="4" opacity="0.7">SECRET STAIRS</text>',
                '<text x="200" y="100" text-anchor="middle" fill="white" font-size="26" font-family="Arial, sans-serif" font-weight="bold">WELCOME PASS</text>',
                '<circle cx="200" cy="360" r="16" fill="none" stroke="#0052FF" stroke-width="1" opacity="0.5"/>',
                '<text x="200" y="365" text-anchor="middle" fill="#3380FF" font-size="11" font-family="monospace">#',
                tokenStr,
                '</text>'
            )
        );
    }
}
