const Web3 = require("web3");
const Contract = require("@truffle/contract");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const XRegExp = require("xregexp");
const Fs = require("fs");
const argv = require("yargs")
  .env(false)
  .command(
    "addValidator <account>",
    "vote for a node to be added as new validator",
    {
      account: {
        description: "address of the new validator as a hexadecimal string",
        type: "string",
      },
    }
  )
  .command("removeValidator <account>", "vote for a validator to be removed", {
    account: {
      description: "address of the validator as a hexadecimal string",
      type: "string",
    },
  })
  .command("removeVote <account>", "remove the vote for an account", {
    account: {
      description: "address of the account as a hexadecimal string",
      type: "string",
    },
  })
  .command("getResult", "get the result of the vote", {})
  .command("adminVote <account>", "Only Admin can vote", {
    account: {
      description: "address of the account as a hexadecimal string",
      type: "string",
    },
  })
  .command("getValidators", "get current validators", {})
  .command("getAdmin", "get current admin", {})
  .option("contractAddress", {
    alias: "a",
    default: "0000000000000000000000000000000000007777",
    describe: "address of the validator management contract",
    type: "string",
  })
  .option("privateKey", {
    demandOption: true,
    alias: "p",
    describe: "private key in hexadecimal format",
    type: "string",
  })
  .option("url", {
    alias: "u",
    demandOption: true,
    default: "http://localhost:8545",
    describe: "URL of the Ethereum client",
    type: "string",
  })
  .option("chainId", {
    alias: "i",
    demandOption: true,
    default: "1522",
    describe: "chainId of the blockchain",
    type: "string",
  })
  .help()
  .alias("help", "h").argv;

function prefix0x(need0x, str) {
  if (need0x && !str.startsWith("0x")) {
    return "0x" + str;
  } else if (!need0x && str.startsWith("0x")) {
    return str.substr(2);
  }
  return str;
}

function getHex(str, len, need0x, name) {
  var re = XRegExp(`^0x[0-9A-Fa-f]{${len}}$`);
  if (!re.test(prefix0x(true, str))) {
    console.log(`ERROR: Invalid hex string for ${name}: ${str}`);
    if (str.length !== len + 2) {
      console.log(
        `Expected length is ${len} digits, actual length is ${
          str.length - 2
        } digits`
      );
    }
    process.exit(-1);
  }
  return prefix0x(need0x, str);
}

function printEvent(eventname, receipt) {
  let result;
  try {
    result = receipt.events[eventname].returnValues;
  } catch (e) {
    if (e.message === "Cannot read property 'returnValues' of undefined") {
      console.log("No event was received.");
      return;
    }
  }
  switch (eventname) {
    case "Validator":
      const added = result.added ? "added" : "removed";
      console.log(
        `Success: Account ${result.byAccount} has ${added} validator ${result.validator}. Active validators: ${result.numValidators}.`
      );
      break;
    case "Vote":
      const addRemove = result.voteToAdd ? "add" : "remove";
      const voteRemoved = result.voteRemoved
        ? "removed their vote"
        : "has voted";
      const numVotesString =
        result.numVotes === "1" ? "is 1 vote" : `are ${result.numVotes} votes`;
      console.log(
        `Success: Account ${result.votingAccount} ${voteRemoved} to ${addRemove} account ${result.accountVotedFor}.`
      );
      console.log(
        `There ${numVotesString} now and ${result.numVotesNeeded} needed to ${addRemove} this account.`
      );
      break;
    default:
      console.log(result);
  }
}

async function main() {
  // This file is generated using 'solc --abi ValidatorSmartContractSupermajority.sol -o .'
  const abi = Fs.readFileSync(
    "ValidatorSmartContractSupermajority.abi",
    "utf-8"
  );
  const contractJson = JSON.parse(abi);

  let provider = new HDWalletProvider({
    privateKeys: [getHex(argv.privateKey, 64, false, "privateKey")],
    providerOrUrl: argv.url,
    chainId: Number(argv.chainId),
  });

  web3 = new Web3(provider);
  web3.eth.handleRevert = true;

  const myAccount = web3.eth.accounts.privateKeyToAccount(
    prefix0x(true, argv.privateKey)
  );
  const mycontract = await new web3.eth.Contract(
    contractJson,
    getHex(argv.contractAddress, 40, false, "contractAddress")
  );

  let validators;
  // check whether the contract address is correct
  try {
    validators = await mycontract.methods.getValidators().call();
    if (
      validators.length < 1 ||
      !web3.utils.isAddress(web3.utils.toChecksumAddress(validators[0]))
    ) {
      console.log(
        "The contract address provided is not correct. Please check and rerun!"
      );
      console.log(
        `Got the following return value calling the getValidators method on the contract:\n${validators}`
      );
      process.exit(-1);
    }
  } catch (e) {
    console.log(
      "The contract address provided is not correct. Please check and rerun!"
    );
    console.log(
      `Got the following error message calling the getValidators method on the contract:\n${e.message}`
    );
    process.exit(-1);
  }

  let receipt;
  try {
    switch (argv._[0]) {
      case "getAdmin":
        console.log(
          `Admin: ${await mycontract.methods.getAdminAddress().call()}`
        );
      case "adminVote":
        console.log(
          `Sending a transaction from account ${myAccount.address} to vote`
        );
        receipt = await mycontract.methods
          .adminVoteToAddValidator(getHex(argv.account, 40, true, "account"))
          .send({ from: myAccount.address });
        printEvent("Vote", receipt);
        console.log("Admin Successfuly Added the New Validator");
        break;
      case "getResult":
        console.log(`Result: ${await mycontract.methods.getResult().call()}`);
        break;
      case "getValidators":
        console.log(`Validators: ${validators}`); // validators have already been retrieved when we checked the contract
        break;
      case "addValidator":
        console.log(
          `Sending a transaction from account ${myAccount.address} to vote to add address ${argv.account} to the validators`
        );
        receipt = await mycontract.methods
          .voteToAddValidator(getHex(argv.account, 40, true, "account"))
          .send({ from: myAccount.address });
        printEvent("Vote", receipt);
        break;
      case "removeValidator":
        console.log(
          `Sending a transaction from account ${myAccount.address} to vote to remove validator ${argv.account}`
        );
        receipt = await mycontract.methods
          .voteToRemoveValidator(getHex(argv.account, 40, true, "account"))
          .send({ from: myAccount.address });
        printEvent("Vote", receipt);
        break;
      case "removeVote":
        console.log(
          `Sending a transaction from account ${myAccount.address} to remove vote for account ${argv.account}`
        );
        receipt = await mycontract.methods
          .removeVoteForAccount(getHex(argv.account, 40, true, "account"))
          .send({ from: myAccount.address });
        printEvent("Vote", receipt);
        break;
      default:
        console.log(`Unknown command ${argv._[0]}`);
        break;
    }
  } catch (e) {
    const message = e.message;
    const lines = message.split("\n");
    if (
      lines.length > 1 &&
      lines[0] === "Execution reverted" &&
      lines[1].length > 138 &&
      lines[1].startsWith("0x")
    ) {
      console.error(
        `Execution reverted with revert reason:\n${web3.utils.hexToAscii(
          "0x" + lines[1].substr(138)
        )}`
      );
    } else {
      console.error(message);
    }
    process.exit(-1);
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}
