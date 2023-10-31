const BN = require("bn.js/lib/bn");
const fs = require("fs");
const XRegExp = require("xregexp");
const { sha3, soliditySha3, padLeft } = require("web3-utils");

function main() {
  var text = fs.readFileSync("./initialValidators.txt", "utf-8").trim();
  var validators = text.split("\n");

  let section = {};
  let contract = {};
  section["<Address of Contract>"] = contract;
  contract.comment = "validator smart contract";
  contract.balance = "0x00";
  contract.code = "0x<Contract Code>";
  let storage = {};

  // length of the validator array is stored in slot 0
  storage["0000000000000000000000000000000000000000000000000000000000000000"] =
    padLeft(validators.length, 64).substring(2);

  // validator array entries are stored beginning at slot sha3(slot(0))
  let firstSlotForValidatorArray = sha3(
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  ).substring(2);
  for (i = 0; i < validators.length; i++) {
    let slot = new BN(firstSlotForValidatorArray, 16)
      .add(new BN(i))
      .toString(16);
    storage[padLeft(slot, 64)] = padLeft(
      validators[i].substring(2).toLowerCase(),
      64
    );
  }

  // mappings for the validator addresses are stored in slot sha3(address | slot(1))
  let pValidator =
    "0000000000000000000000000000000000000000000000000000000000000001";
  validators.forEach((validator) => {
    let address = padLeft(validator.substring(2), 64);
    let slotValidator = sha3("0x" + address + pValidator)
      .substring(2)
      .toLowerCase();
    storage[padLeft(slotValidator, 64)] = padLeft("01", 64); // true(0x01)
  });

  contract.storage = storage;

  var writeStream = fs.createWriteStream("Storage.txt");
  let stringify = JSON.stringify(section, null, "\t");
  writeStream.write(stringify.substring(2, stringify.length - 2)); // do not write lines with enclosing brackets
}

if (require.main === module) {
  main();
}
