let CPTournament = artifacts.require("./CPTournament.sol");
module.exports = function(deployer) {
    deployer.deploy(CPTournament);
};