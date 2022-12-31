// Implementation of a contract to select validators using an allowlist

pragma solidity >=0.5.0;

import "../ValidatorSmartContractInterface.sol";

contract ValidatorSmartContractSupermajority is ValidatorSmartContractInterface {

    event Validator(
        address indexed validator,
        uint numValidators,
        bool added
    );

    event Vote(
        address indexed accountVotedFor,
        address indexed votingAccount,
        uint numVotes,
        uint numVotesNeeded,
        bool voteToAdd,
        bool voteRemoved
    );

    uint constant MAX_VALIDATORS = 256;

    address[] private validators;
    mapping(address => bool) private isValidator;
    mapping(address => address[]) private currentVotes;// mapping the votes for adding or removing an account to the accounts that voted for it

    modifier senderIsValidator() {
        require(isValidator[msg.sender], "sender is not a validator");
        _;
    }

    constructor (address[] memory initialValidators) public {
        require(initialValidators.length > 0, "no initial validator accounts");
        require(initialValidators.length <= MAX_VALIDATORS, "number of validators cannot be larger than 256");

        for(uint i = 0; i < initialValidators.length; i++) {
            require(initialValidators[i] != address(0), "initial validators cannot be zero");
            validators.push(initialValidators[i]);
            isValidator[initialValidators[i]] = true;
            emit Validator(initialValidators[i], validators.length, true);
        }
    }

    function getValidators() override external view returns (address[] memory) {
        return validators;
    }

    function voteToAddValidator(address account) external senderIsValidator {
        require(validators.length < MAX_VALIDATORS, "number of validators cannot be larger than 256");
        require(account != address(0), "account to add cannot be 0");
        require(!isValidator[account], "account to add is already a validator");

        for(uint i = 0; i < currentVotes[account].length; i++) {
            require(currentVotes[account][i] != msg.sender, "sender has already voted to add account");
        }
        currentVotes[account].push(msg.sender);
        emit Vote(account, msg.sender, currentVotes[account].length, validators.length * 2 / 3 + 1, true, false);

        if(currentVotes[account].length > validators.length * 2 / 3) {
            endVoting(account);
        }
    }

    function voteToRemoveValidator(address account) external senderIsValidator {
        require(validators.length > 1, "validator list cannot be empty");
        require(account != address(0), "account to remove cannot be 0");
        require(isValidator[account], "account to remove is not a validator");

        for(uint i = 0; i < currentVotes[account].length; i++) {
            require(currentVotes[account][i] != msg.sender, "sender has already voted to remove account");
        }
        currentVotes[account].push(msg.sender);
        emit Vote(account, msg.sender, currentVotes[account].length, validators.length * 2 / 3 + 1, false, false);

        if(currentVotes[account].length > validators.length * 2 / 3) {
            endVoting(account);
        }
    }

    function removeVoteForAccount(address account) external senderIsValidator {
        for(uint i = 0; i < currentVotes[account].length; i++) {
            if(currentVotes[account][i] == msg.sender) {
                currentVotes[account][i] = currentVotes[account][currentVotes[account].length - 1];
                currentVotes[account].pop();
                break;
            }
        }
        emit Vote(account, msg.sender, currentVotes[account].length, validators.length * 2 / 3 + 1, !isValidator[account], true);
    }

    function endVoting(address account) private {
        delete(currentVotes[account]);
        if(isValidator[account]) {
            for(uint i = 0; i < validators.length; i++) {
                if(validators[i] == account) {
                    validators[i] = validators[validators.length - 1];
                    validators.pop();
                    break;
                }
            }
            isValidator[account] = false;
        } else {
            validators.push(account);
            isValidator[account] = true;
        }
        emit Validator(account, validators.length, isValidator[account]);
    }
}
