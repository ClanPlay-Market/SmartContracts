const CPTournament = artifacts.require("CPTournament");

contract('CPTournament', async (accounts) => {
    let instance;
    let gasUsed = [0,0,0,0,0,0];
    let initialBalance = [0,0,0,0,0,0];

    beforeEach('setup contract for each test', async function () {
        instance = await CPTournament.deployed();
    });

    async function getGasUsed(acc, txInfo) {
        const receipt = web3.eth.getTransactionReceipt(txInfo.tx);
        const gas = receipt.cumulativeGasUsed;
        //console.log(`gasUsed: ${receipt.gasUsed}, cumulativeGasUsed: ${receipt.cumulativeGasUsed}`);
        // Obtain gasPrice from the transaction
        const tx = await web3.eth.getTransaction(txInfo.tx);
        // console.log(`gasPrice: ${tx.gasPrice}`);
        gasUsed_ = tx.gasPrice.mul(gas)*1;
        gasUsed[acc] += gasUsed_;
        // console.log(`gasUsedResult: ${gasUsed_}`);
        return gasUsed_;
    }

    async function accountDiff(acc) {
        let balance = await web3.eth.getBalance(accounts[acc]).toNumber();
        // console.log(`acc[${acc}]: balance=${balance} initialBalance=${initialBalance[acc]} `+
        //     `gasUsed=${gasUsed[acc]} result=${balance+gasUsed[acc]-initialBalance[acc]}`);
        balance = balance * 1;
        balance += gasUsed[acc];

        console.log('Balance of account['+acc+']='+(balance-initialBalance[acc])/1e18);
        return balance-initialBalance[acc];
    }
    async function contractBalance() {
        let balance = await web3.eth.getBalance(instance.address);
        console.log('Balance of contract='+balance/1e18);
        return balance * 1;
    }
    function my_assert_equal(arg1, arg2) {
        const div = 1e6;
        assert.equal(Math.round(arg1/div),Math.round(arg2/div));
    }

    it("Initial balance of contract must be zero", async () => {
        console.log('Contract address: '+instance.address);
        let balance = await web3.eth.getBalance(instance.address);
        assert.equal(balance.valueOf(), 0);
        let owner = await instance.owner();
        console.log('Contract owner: '+owner);
        await instance.testMode(true);
    });
    it("Print accounts initial balances", async () => {
        for (let i = 0; i < 6; i++) {
            let balance = await web3.eth.getBalance(accounts[i]);
            initialBalance[i] = balance;
            console.log('Account['+i+'] address='+accounts[i]+', balance='+balance.valueOf()/1e18);
        }
    });
    it("Init tournament 1, check contract balance", async () => {
        let receipt = await instance.initTournament({from: accounts[1], value: 1.1e18});
        await getGasUsed(1, receipt);
        assert.equal(await contractBalance(), 1.1e18);
        my_assert_equal(await accountDiff(0), 0e18);
        my_assert_equal(await accountDiff(1), -1.1e18);
    });
    it("Start tournament 1", async () => {
        let receipt = await instance.startTournament(accounts[1], [], {from: accounts[0]});
        await getGasUsed(0, receipt);
        assert.equal(await contractBalance(), 1.1e18);
        my_assert_equal(await accountDiff(0), 0e18);
        my_assert_equal(await accountDiff(1), -1.1e18);
    });
    it("End tournament 1", async () => {
        let receipt = await instance.endTournament(accounts[1], [], {from: accounts[0]});
        await getGasUsed(0, receipt);
        assert.equal(await contractBalance(), 0e18);
        my_assert_equal(await accountDiff(0), 0.1e18);
        my_assert_equal(await accountDiff(1), -0.1e18);
    });
    it("Init tournament 2, check contract balance", async () => {
        let receipt = await instance.initTournament({from: accounts[1], value: 2e18});
        await getGasUsed(1, receipt);
        assert.equal(await contractBalance(), 2e18);
        my_assert_equal(await accountDiff(0),  0.1e18);
        my_assert_equal(await accountDiff(1), -2.1e18);
    });
    it("Participate tournament 2", async () => {
        let receipt = await instance.participateTournament(accounts[1], {from: accounts[2]});
        await getGasUsed(2, receipt);
        assert.equal(await contractBalance(), 2e18);
        my_assert_equal(await accountDiff(0),  0.1e18);
        my_assert_equal(await accountDiff(1), -2.1e18);
        my_assert_equal(await accountDiff(2), 0e18);
    });
    it("Start tournament 2", async () => {
        let receipt = await instance.startTournament(accounts[1], [100], {from: accounts[0]});
        await getGasUsed(0, receipt);
        assert.equal(await contractBalance(), 2e18);
        my_assert_equal(await accountDiff(0),  0.1e18);
        my_assert_equal(await accountDiff(1), -2.1e18);
        my_assert_equal(await accountDiff(2), 0e18);
    });
    it("End tournament 2", async () => {
        let receipt = await instance.endTournament(accounts[1], [200], {from: accounts[0]});
        await getGasUsed(0, receipt);
        assert.equal(await contractBalance(), 0e18);
        my_assert_equal(await accountDiff(0),  0.2e18);
        my_assert_equal(await accountDiff(1), -2.1e18);
        my_assert_equal(await accountDiff(2), 1.9e18);
    });
    it("Init tournament 3, check contract balance", async () => {
        let receipt = await instance.initTournament({from: accounts[1], value: 1.3e18});
        await getGasUsed(1, receipt);
        assert.equal(await contractBalance(), 1.3e18);
        my_assert_equal(await accountDiff(0),  0.2e18);
        my_assert_equal(await accountDiff(1), -3.4e18);
        my_assert_equal(await accountDiff(2), 1.9e18);
    });
    it("Participate tournament 3", async () => {
        let receipt = await instance.participateTournament(accounts[1], {from: accounts[2]});
        await getGasUsed(2, receipt);
        receipt = await instance.participateTournament(accounts[1], {from: accounts[3]});
        await getGasUsed(3, receipt);
    });
    it("Start tournament 3", async () => {
        let receipt = await instance.startTournament(accounts[1], [100, 100], {from: accounts[0]});
        await getGasUsed(0, receipt);
        assert.equal(await contractBalance(), 1.3e18);
        my_assert_equal(await accountDiff(0),  0.2e18);
        my_assert_equal(await accountDiff(1), -3.4e18);
        my_assert_equal(await accountDiff(2), 1.9e18);
        my_assert_equal(await accountDiff(3), 0e18);
    });
    it("End tournament 3", async () => {
        let receipt = await instance.endTournament(accounts[1], [200, 300], {from: accounts[0]});
        await getGasUsed(0, receipt);
        assert.equal(await contractBalance(), 0e18);
        my_assert_equal(await accountDiff(0),  0.3e18);
        my_assert_equal(await accountDiff(1), -3.4e18);
        my_assert_equal(await accountDiff(2), 2.3e18);
        my_assert_equal(await accountDiff(3), 0.8e18);
    });
    it("Init tournament 4, check contract balance", async () => {
        let receipt = await instance.initTournament({from: accounts[1], value: 1.9e18});
        await getGasUsed(1, receipt);
        assert.equal(await contractBalance(), 1.9e18);
        my_assert_equal(await accountDiff(0),  0.3e18);
        my_assert_equal(await accountDiff(1), -5.3e18);
        my_assert_equal(await accountDiff(2), 2.3e18);
        my_assert_equal(await accountDiff(3), 0.8e18);
    });
    it("Participate tournament 4", async () => {
        let receipt = await instance.participateTournament(accounts[1], {from: accounts[2]});
        await getGasUsed(2, receipt);
        receipt = await instance.participateTournament(accounts[1], {from: accounts[3]});
        await getGasUsed(3, receipt);
        receipt = await instance.participateTournament(accounts[1], {from: accounts[4]});
        await getGasUsed(4, receipt);
        receipt = await instance.participateTournament(accounts[1], {from: accounts[5]});
        await getGasUsed(5, receipt);
    });
    it("Start tournament 4", async () => {
        let receipt = await instance.startTournament(accounts[1], [100, 100, 200, 200], {from: accounts[0]});
        await getGasUsed(0, receipt);
        assert.equal(await contractBalance(), 1.9e18);
        my_assert_equal(await accountDiff(0),  0.3e18);
        my_assert_equal(await accountDiff(1), -5.3e18);
        my_assert_equal(await accountDiff(2), 2.3e18);
        my_assert_equal(await accountDiff(3), 0.8e18);
        my_assert_equal(await accountDiff(4), 0e18);
        my_assert_equal(await accountDiff(5), 0e18);
    });
    it("End tournament 4", async () => {
        let receipt = await instance.endTournament(accounts[1], [200, 300, 202, 203], {from: accounts[0]});
        await getGasUsed(0, receipt);
        assert.equal(await contractBalance(), 0e18);
        my_assert_equal(await accountDiff(0),  0.4e18);
        my_assert_equal(await accountDiff(1), -5.3e18);
        my_assert_equal(await accountDiff(2), 2.7e18);
        my_assert_equal(await accountDiff(3), 2e18);
        my_assert_equal(await accountDiff(4), 0e18);
        my_assert_equal(await accountDiff(5), 0.2e18);
    });
});