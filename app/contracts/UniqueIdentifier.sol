// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


struct ProofVerificationParams {
  bytes32 vkeyHash;
  bytes proof;
  bytes32[] publicInputs;
  bytes committedInputs;
  uint256[] committedInputCounts;
  uint256 validityPeriodInSeconds;
  string domain;
  string scope;
  bool devMode;
}

interface IZKPassportVerifier {
  // Verify the proof
  function verifyProof(ProofVerificationParams calldata params) external returns (bool verified, bytes32 uniqueIdentifier);
  
  function verifyScopes(bytes32[] calldata publicInputs, string calldata domain, string calldata scope) external view returns (bool);
}

interface RLN {
    function register(
        uint256 idCommitment,
        uint32 rateLimit,
        uint256[] calldata idCommitmentsToErase
    ) external;
}

contract UniqueIdentifier {
    IZKPassportVerifier public zkPassportVerifier;
    RLN public rln;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    /**
     * @dev Constructor to initialize contract dependencies
     * @param _zkPassportVerifier Address of the ZKPassportVerifier contract
     * @param _rln Address of the RLN contract
     */

    constructor(
        IZKPassportVerifier _zkPassportVerifier,
        RLN _rln
    ) {
        zkPassportVerifier = IZKPassportVerifier(_zkPassportVerifier);
        rln = RLN(_rln);
        owner = msg.sender;
    }
    
    // Mapping to store unique identifiers
    mapping(bytes32 => bool) private identifiers;
    
    // Event emitted when a new identifier is registered
    event IdentifierRegistered(bytes32 indexed identifier);
        
    /**
     * @dev Register a new unique identifier
     * @param params The identifier string to register
     * @param idCommitment The RLN identity commitment
     * @param rateLimit The RLN rate limit (e.g., 10)
     */
    function registerIdentifier(ProofVerificationParams calldata params, uint256 idCommitment, uint32 rateLimit) public {
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        require(verified, "Proof is invalid");
        require(identifiers[uniqueIdentifier] == false, "Identifier already exists");
        
        // Register the new identifier
        identifiers[uniqueIdentifier] = true;

        // Register in RLN with a rate limit of 10 and no commitments to erase
        rln.register(idCommitment, rateLimit, new uint256[](0));
        
        // Emit event
        emit IdentifierRegistered(uniqueIdentifier);
    }
    
    /**
     * @dev Check if an identifier exists
     * @param identifier The identifier string to check
     * @return exists True if identifier exists, false otherwise
     */
    function checkIdentifier(bytes32 identifier) public view returns (bool) {
        return identifiers[identifier];
    }
    
    /**
     * @dev Check if multiple identifiers exist
     * @param identifiersArray Array of identifier strings to check
     * @return existsArray Array of booleans indicating existence of each identifier
     */
    function checkIdentifiers(bytes32[] memory identifiersArray) public view returns (bool[] memory) {
        bool[] memory existsArray = new bool[](identifiersArray.length);
        
        for (uint256 i = 0; i < identifiersArray.length; i++) {
            existsArray[i] = identifiers[identifiersArray[i]];
        }
        
        return existsArray;
    }

    /**
     * @dev Update the RLN contract address
     * @param _newRLN The new RLN contract address
     */
    function setRLNAddress(RLN _newRLN) public onlyOwner {
        require(address(_newRLN) != address(0), "RLN address cannot be zero");
        rln = _newRLN;
    }
}