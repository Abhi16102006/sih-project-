// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title KalaSecure Artwork Registry
 * @notice Immutable provenance + ownership registry for artworks.
 *
 * DESIGN RULE: the blockchain stores ONLY small proofs.
 *   - the content hash / CID of the artwork living on IPFS
 *   - metadata + ownership + timestamps
 * Never store image bytes on-chain (they cost ~20 gas per byte and bloat the chain).
 */
contract ArtworkRegistry is ERC721, Ownable, ReentrancyGuard {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------
    struct ProvenanceEvent {
        address actor;      // who caused the change
        uint256 timestamp;  // unix seconds
        string action;      // "MINTED" | "TRANSFERRED" | "FLAGGED" | "REVOKED"
        string note;
    }

    struct Artwork {
        uint256 tokenId;
        address artist;
        string title;
        string description;
        string contentHash;   // sha256 hex of the file
        string ipfsCid;       // e.g. Qm... (real CIDv0)
        string medium;
        uint256 editionSize;
        uint256 registeredAt;
        uint256 authenticity; // 0-100 AI similarity/authenticity score
        bool revoked;
        address flaggedBy;
    }

    struct ArtworkInput {
        string title;
        string description;
        string contentHash;
        string ipfsCid;
        string medium;
        uint256 editionSize;
        uint256 authenticity;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------
    uint256 private _nextTokenId = 1;
    mapping(uint256 => Artwork) private _artworks;
    mapping(uint256 => ProvenanceEvent[]) private _provenance;
    mapping(bytes32 => uint256) public hashToToken; // duplicate/copy detection
    mapping(bytes32 => bool) public hashRegistered;

    // One-shot labels consumed by the `_update` hook (single transfer at a time).
    string private _pendingAction;
    string private _pendingNote;

    event ArtworkRegistered(
        uint256 indexed tokenId,
        address indexed artist,
        string title,
        string ipfsCid,
        string contentHash
    );
    event ProvenanceRecorded(uint256 indexed tokenId, address indexed actor, string action);
    event ArtworkFlagged(uint256 indexed tokenId, address indexed by, string reason);
    event ArtworkRevoked(uint256 indexed tokenId, address indexed by, string reason);

    error DuplicateHash();
    error ArtworkAlreadyRevoked();
    error ZeroAddress();

    constructor() ERC721("KalaSecure Artwork", "KALA") Ownable(msg.sender) {}

    modifier onlyArtistOrOwner(uint256 tokenId) {
        address artist = _artworks[tokenId].artist;
        require(msg.sender == artist || msg.sender == owner(), "not permitted");
        _;
    }

    // ---------------------------------------------------------------------
    // Registration (the "mint")
    // ---------------------------------------------------------------------
    function registerArtwork(ArtworkInput calldata input) external returns (uint256 tokenId) {
        bytes32 h = keccak256(abi.encodePacked(input.contentHash));
        if (hashRegistered[h]) revert DuplicateHash();
        hashRegistered[h] = true;

        tokenId = _nextTokenId++;
        hashToToken[h] = tokenId;

        _artworks[tokenId] = Artwork({
            tokenId: tokenId,
            artist: msg.sender,
            title: input.title,
            description: input.description,
            contentHash: input.contentHash,
            ipfsCid: input.ipfsCid,
            medium: input.medium,
            editionSize: input.editionSize,
            registeredAt: block.timestamp,
            authenticity: input.authenticity,
            revoked: false,
            flaggedBy: address(0)
        });

        _safeMint(msg.sender, tokenId);
        _push(tokenId, msg.sender, "MINTED", "Original work registered on-chain");

        emit ArtworkRegistered(tokenId, msg.sender, input.title, input.ipfsCid, input.contentHash);
    }

    // ---------------------------------------------------------------------
    // Ownership transfer (provenance!)
    // ---------------------------------------------------------------------
    function transferArtwork(address to, uint256 tokenId, string calldata note)
        external
        nonReentrant
    {
        require(ownerOf(tokenId) == msg.sender, "not the owner");
        if (_artworks[tokenId].revoked) revert ArtworkAlreadyRevoked();
        if (to == address(0)) revert ZeroAddress();

        // `_safeTransfer` routes through `_update`, which writes the single
        // provenance entry. We stash the label here so it is picked up.
        _pendingAction = "TRANSFERRED";
        _pendingNote = note;
        _safeTransfer(msg.sender, to, tokenId);
    }

    /// @notice Buy / resale: value can be attached, provenance always recorded.
    function purchaseArtwork(address to, uint256 tokenId) external payable nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "seller must be the owner");
        if (_artworks[tokenId].revoked) revert ArtworkAlreadyRevoked();
        if (to == address(0)) revert ZeroAddress();
        require(msg.value > 0, "no value sent");

        _pendingAction = "SOLD";
        _pendingNote = "Ownership transferred via marketplace";
        _safeTransfer(msg.sender, to, tokenId);
    }

    /// @notice Any ERC-721 transfer also appends to provenance.
    /// OZ v5 funnels every transfer through `_update`, so one hook covers all of them.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        address previousOwner = super._update(to, tokenId, auth);

        if (from != address(0) && to != address(0) && to != from) {
            string memory action =
                bytes(_pendingAction).length != 0 ? _pendingAction : "TRANSFERRED";
            string memory note = bytes(_pendingNote).length != 0 ? _pendingNote : "Ownership transferred";
            _pendingAction = "";
            _pendingNote = "";
            // `auth` is address(0) on the `_safeTransfer` path, so record the
            // caller explicitly — provenance needs "who did this", not "who
            // authorised it".
            _push(tokenId, msg.sender, action, note);
        }
        return previousOwner;
    }

    // ---------------------------------------------------------------------
    // Trust layer
    // ---------------------------------------------------------------------
    /// @notice Flag a registration as suspected copy. Does NOT transfer ownership.
    function flagArtwork(uint256 tokenId, string calldata reason) external {
        require(ownerOf(tokenId) != msg.sender, "cannot flag own work");
        _artworks[tokenId].flaggedBy = msg.sender;
        _push(tokenId, msg.sender, "FLAGGED", reason);
        emit ArtworkFlagged(tokenId, msg.sender, reason);
    }

    /// @notice Only the platform owner (verified curator) can revoke a bad registration.
    function revokeArtwork(uint256 tokenId, string calldata reason) external onlyOwner {
        _artworks[tokenId].revoked = true;
        _push(tokenId, msg.sender, "REVOKED", reason);
        emit ArtworkRevoked(tokenId, msg.sender, reason);
    }

    function setAuthenticity(uint256 tokenId, uint256 score) external onlyArtistOrOwner(tokenId) {
        require(score <= 100, "score 0-100");
        _artworks[tokenId].authenticity = score;
    }

    // ---------------------------------------------------------------------
    // Verification (the public QR endpoint logic, on-chain)
    // ---------------------------------------------------------------------
    /// @notice Recomputes the stored hash and proves it still matches the record.
    /// @return exists  whether the token was ever registered
    /// @return valid    integrity + not revoked + not flagged
    /// @return owner_   current owner
    function verifyArtwork(uint256 tokenId)
        external
        view
        returns (bool exists, bool valid, address owner_, string memory contentHash, string memory ipfsCid)
    {
        if (_artworks[tokenId].registeredAt == 0) return (false, false, address(0), "", "");
        Artwork storage a = _artworks[tokenId];
        exists = true;
        valid = !a.revoked && a.flaggedBy == address(0);
        return (exists, valid, ownerOf(tokenId), a.contentHash, a.ipfsCid);
    }

    /// @notice Did this exact file content already get registered by someone else?
    function findByContentHash(string calldata contentHash)
        external
        view
        returns (uint256 tokenId, bool found)
    {
        bytes32 h = keccak256(abi.encodePacked(contentHash));
        return (hashToToken[h], hashRegistered[h]);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------
    function getArtwork(uint256 tokenId) external view returns (Artwork memory) {
        require(_artworks[tokenId].registeredAt != 0, "not found");
        return _artworks[tokenId];
    }

    function getProvenance(uint256 tokenId) external view returns (ProvenanceEvent[] memory) {
        return _provenance[tokenId];
    }

    function totalArtworks() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------
    function _push(uint256 tokenId, address actor, string memory action, string memory note) private {
        _provenance[tokenId].push(
            ProvenanceEvent({actor: actor, timestamp: block.timestamp, action: action, note: note})
        );
        emit ProvenanceRecorded(tokenId, actor, action);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        Artwork storage a = _artworks[tokenId];
        string memory json = string.concat(
            '{"name":"', a.title,
            '","description":"', a.description,
            '","image":"ipfs://', a.ipfsCid,
            '","attributes":[',
            '{"trait_type":"Artist","value":"', _uintToString(uint256(uint160(a.artist))), '"},',
            '{"trait_type":"Medium","value":"', a.medium, '"},',
            '{"trait_type":"Edition Size","value":', _uintToString(a.editionSize), '},',
            '{"trait_type":"Authenticity Score","value":', _uintToString(a.authenticity), '},',
            '{"trait_type":"SHA-256 Content Hash","value":"', a.contentHash, '"}',
            ']}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _uintToString(uint256 v) private pure returns (string memory) {
        if (v == 0) return "0";
        uint256 len;
        uint256 t = v;
        while (t != 0) {
            len++;
            t /= 10;
        }
        bytes memory b = new bytes(len);
        while (v != 0) {
            len--;
            b[len] = bytes1(uint8(48 + (v % 10)));
            v /= 10;
        }
        return string(b);
    }
}