# Validator smart contracts

The QBFT consensus protocol implementation in the Quorum clients (GoQuorum and Besu) allows you to use a smart
contract to specify the validators that are used to propose and validate blocks. You can create your own
smart contract based on your organisation's requirements.

These smart contracts must implement the `ValidatorSmartContractInterface.sol` interface contract, specifically the
function:

    function getValidators() external view returns (address[] memory)

This repository contains an example smart contract that implements the interface.

General information about QBFT can be found in the [Hyperledger Besu documentation](https://besu.hyperledger.org/en/stable/HowTo/Configure/Consensus-Protocols/QBFT/).

## Example contract

The example smart contract can be found in the `contracts/supermajority` directory.

The contract holds the list of validator, who can vote to add/remove QBFT validators using an API.

Validators can use the API of this contract to:

* Add a validator
* Remove a validator
* Remove votes they have cast to add or remove a validator

For an election to be successful more than 66% of the current validators must vote. The votes are counted automatically, in every add/remove transaction, if the number of votes are enough.

Events are emitted to enable users to get information about changes to the validators and voting.

To use this contract from the genesis block of a blockchain, the initial state of this contract
must be set in the genesis file. The `scripts/supermajority/genesisContent` directory of this
repository contains a javascript script that creates the storage section for this contract.
Refer to the ["Create the genesis file content"](#create-the-genesis-file-content) section.

**Information**: See the web3-js based script in the `scripts/supermajority/cli` directory for an example CLI script
that calls the allowlist smart contract functions.

### Compiling the contract for deployment

From the contracts directory

```sh
cd contracts/
```

we can compile the contract to create the bytecode to add to the genesis file.

For this matter we use the solc 0.8.17 Docker container to generate the bytecode in `contracts/supermajority/ValidatorSmartContractSupermajority.bin-runtime`:

```sh
docker run --rm --entrypoint=/bin/sh --workdir=/tmp/contracts/supermajority --volume=$PWD:/opt/contracts ethereum/solc:0.8.17-alpine -c \
  "cp -r /opt/contracts/. .. && cp ../ValidatorSmartContractInterface.sol .; \
   solc --optimize --optimize-runs=200 --bin-runtime --evm-version=byzantium --overwrite -o . ./ValidatorSmartContractSupermajority.sol &>/dev/null; \
   cat ValidatorSmartContractSupermajority.bin-runtime" > ./supermajority/ValidatorSmartContractSupermajority.bin-runtime
```

### Running tests

Unit tests are executed via Truffle in a node 19 Docker container:

```sh
docker run --rm --entrypoint=/bin/sh --workdir=/tmp/validator-smart-contracts --volume=$PWD:/opt/validator-smart-contracts node:19-alpine3.16 -c \
  "cp -r /opt/validator-smart-contracts/. .; \
   yarn install; \
   yarn truffle compile; \
   yarn truffle test"
```

## Create the genesis file content

The `scripts/supermajority/genesisContent` directory contains the `createContent.js` script that generates the content
required for the genesis file of a network that uses the example smart contracts (`contracts/supermajority`).

### Create the input file

The script reads the file `initialValidators.txt` that contains in each line the address of one validators:

    0x5B38Da6a701c568545dCfcB03FcB875f56beddC4
    0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2
    0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c
    0x4b20993Bc481177ec7E8f571ceCaE8A9e22C02db

You can export a validator node's address using the following Besu command:

    besu public-key export-address

### Run the Script

In the directory of the script

```sh
cd scripts/supermajority/genesisContent/
```

we use the node 19 Docker container to run the script and generate the output:

```sh
docker run --rm --entrypoint=/bin/sh --workdir=/tmp/genesisContent --volume=$PWD:/opt/genesisContent node:19-alpine3.16 -c \
  "cp -r /opt/genesisContent/. .; \
   yarn install &>/dev/null && node createContent.js &>/dev/null; \
   cat Storage.txt" > Storage.txt
```

### Output

The script creates a file named `Storage.txt`. The content of this file for the above example looks as follows:

```json
"<Address of Contract>": {
	"comment": "validator smart contract",
	"balance": "0x00",
	"code": "0x<Contract Code>",
	"storage": {
		"0000000000000000000000000000000000000000000000000000000000000000": "0000000000000000000000000000000000000000000000000000000000000004",
		"290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563": "0000000000000000000000005b38da6a701c568545dcfcb03fcb875f56beddc4",
		"290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e564": "000000000000000000000000ab8483f64d9c6d1ecf9b849ae677dd3315835cb2",
		"290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e565": "000000000000000000000000ca35b7d915458ef540ade6068dfe2f44e8fa733c",
		"290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e566": "0000000000000000000000004b20993bc481177ec7e8f571cecae8a9e22c02db",
		"36306db541fd1551fd93a60031e8a8c89d69ddef41d6249f5fdc265dbc8fffa2": "0000000000000000000000000000000000000000000000000000000000000001",
		"9d4d959825f0680278e64197773b2a50cd78b2b2cb00711ddbeebf0bf93cd8a4": "0000000000000000000000000000000000000000000000000000000000000001",
		"58d9a93947083dcdedec58d43912ce0326f251a85b7701c5de5bc7d7a150676e": "0000000000000000000000000000000000000000000000000000000000000001",
		"e20f19dc6931eb9e42fe3f21abe1a9ef59942d8e586871d88564d0d0b63a5e5c": "0000000000000000000000000000000000000000000000000000000000000001"
	}
}
```

The content of the file needs to be placed in the genesis file for the network. In addition the `<Address of Contract>`
and `<Contract Code>` must be filled in.

An example of a genesis file using QBFT can be found in the `genesis.json` file in this directory.

* `<Address of Contract>` must be identical to `validatorcontractaddress` located in the `qbft` section of the genesis file.
* `<Contract Code>` must contain the binary runtime code for the `ValidatorSmartContractSupermajority.sol` contract in `contracts/supermajority`.

General information about the genesis file can be found in the [Besu documentation](https://besu.hyperledger.org/en/stable/Reference/Config-Items/).

#### Short Description of the Content of the "storage" Section in the above example output

The storage section defines the state of the contract in the genesis block of the blockchain.
For general information on the layout of state variables in storage see
https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html.

The storage section created by the `createContent.js` script defines
* the initial `validators` array (line 1 - 5 in the storage section)
* the initial `isValidator` mapping (line 6 - 9 in the storage section)

For more detail please see the script.
