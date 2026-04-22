// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract WelcomeNFT is ERC721 {
    using Strings for uint256;

    uint256 private _nextTokenId;
    mapping(address => bool) public hasMinted;

    constructor() ERC721("Coinbase Welcome Pass", "WELCOME") {}

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
        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
                '<rect width="400" height="400" fill="#0052FF"/>',
                '<text x="200" y="120" text-anchor="middle" fill="white" font-size="48" font-family="Arial, sans-serif" font-weight="bold">',
                unicode"🔑",
                "</text>",
                '<text x="200" y="200" text-anchor="middle" fill="white" font-size="28" font-family="Arial, sans-serif" font-weight="bold">',
                "Welcome Pass",
                "</text>",
                '<text x="200" y="240" text-anchor="middle" fill="#99BBFF" font-size="16" font-family="Arial, sans-serif">',
                "Coinbase HQ",
                "</text>",
                '<text x="200" y="320" text-anchor="middle" fill="#6699FF" font-size="14" font-family="monospace">',
                "#",
                tokenId.toString(),
                "</text>",
                "</svg>"
            )
        );

        string memory json = string(
            abi.encodePacked(
                '{"name":"Welcome Pass #',
                tokenId.toString(),
                '","description":"A gasless NFT for Coinbase office visitors who found the secret stairs.","image":"data:image/svg+xml;base64,',
                Base64.encode(bytes(svg)),
                '","attributes":[{"trait_type":"Location","value":"Coinbase HQ"},{"trait_type":"Type","value":"Welcome Pass"}]}'
            )
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }
}
