const SupermajorityContract = artifacts.require("ValidatorSmartContractSupermajority.sol");

var fs = require('fs');
var jsonFile = "build/contracts/ValidatorSmartContractSupermajority.json";
var parsed = JSON.parse(fs.readFileSync(jsonFile));
var supermajorityContractAbi = parsed.abi;


contract ("Account Ingress (no contracts registered)", (accounts) => {
    let supermajorityContract;

    beforeEach("create a new contract for each test", async () => {
        supermajorityContract = await SupermajorityContract.new([accounts[0], accounts[1], accounts[2], accounts[3]], {from: accounts[0]});
    })

    it("should return the 4 validators added in the deployment", async () => {
        let validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);
        assert.equal(validators[0], accounts[0]);
        assert.equal(validators[1], accounts[1]);
        assert.equal(validators[2], accounts[2]);
        assert.equal(validators[3], accounts[3]);
    });

    it("only validators can call voteToAddValidator", async () => {
        try {
            await supermajorityContract.voteToAddValidator(accounts[4], {from: accounts[4]});
        } catch (err) {
            expect(err.reason).to.contain("sender is not a validator");
        }
    });

    it("can add new validator", async () => {
        let validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.voteToAddValidator(accounts[4], {from: accounts[0]});
        await supermajorityContract.voteToAddValidator(accounts[4], {from: accounts[1]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.voteToAddValidator(accounts[4], {from: accounts[2]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 5);
    });

    it("only validators can call voteToRemoveValidator", async () => {
        try {
            await supermajorityContract.voteToRemoveValidator(accounts[0], {from: accounts[4]});
        } catch (err) {
            expect(err.reason).to.contain("sender is not a validator");
        }
    });

    it("can remove a validator", async () => {
        let validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.voteToRemoveValidator(accounts[3], {from: accounts[0]});
        await supermajorityContract.voteToRemoveValidator(accounts[3], {from: accounts[1]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.voteToRemoveValidator(accounts[3], {from: accounts[2]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 3);
    });

    it("cannot remove last validator", async () => {
        let validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.voteToRemoveValidator(accounts[3], {from: accounts[0]});
        await supermajorityContract.voteToRemoveValidator(accounts[3], {from: accounts[1]});
        await supermajorityContract.voteToRemoveValidator(accounts[3], {from: accounts[2]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 3);

        await supermajorityContract.voteToRemoveValidator(accounts[2], {from: accounts[0]});
        await supermajorityContract.voteToRemoveValidator(accounts[2], {from: accounts[1]});
        await supermajorityContract.voteToRemoveValidator(accounts[2], {from: accounts[2]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 2);

        await supermajorityContract.voteToRemoveValidator(accounts[1], {from: accounts[0]});
        await supermajorityContract.voteToRemoveValidator(accounts[1], {from: accounts[1]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 1);

        try {
            await supermajorityContract.voteToRemoveValidator(accounts[0], {from: accounts[0]});
        } catch (err) {
            expect(err.reason).to.contain("validator list cannot be empty");
        }
    });

    it("only validators can call removeVoteForAccount", async () => {
        try {
            await supermajorityContract.removeVoteForAccount(accounts[4], {from: accounts[4]});
        } catch (err) {
            expect(err.reason).to.contain("sender is not a validator");
        }
    });

    it("can remove a vote to add new validator", async () => {
        let validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.voteToAddValidator(accounts[4], {from: accounts[0]});
        await supermajorityContract.voteToAddValidator(accounts[4], {from: accounts[1]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.removeVoteForAccount(accounts[4], {from: accounts[1]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.voteToAddValidator(accounts[4], {from: accounts[2]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);
    });

    it("can remove a vote to remove a validator", async () => {
        let validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.voteToRemoveValidator(accounts[3], {from: accounts[0]});
        await supermajorityContract.voteToRemoveValidator(accounts[3], {from: accounts[1]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.removeVoteForAccount(accounts[3], {from: accounts[1]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);

        await supermajorityContract.voteToRemoveValidator(accounts[3], {from: accounts[2]});
        validators = await supermajorityContract.getValidators();
        assert.lengthOf(validators, 4);
    });
});
