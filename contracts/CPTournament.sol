pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract CPTournament is Ownable {
    uint entryFee = 100 finney;
    uint minPrize = 1 ether;
    uint32 tournamentPrepare = 120 * 60;
    uint32 tournamentLength = 24 * 60 * 60;
    uint32 maxParticipants = 1000;
    bool checkTimings = true;

    struct Participant {
        bool exists;
        int64 initialScore;
        int64 result;
        uint prize;
    }

    struct Tournament {
        uint amount;
        uint startAt;
        uint endAt;
        bool exists;
        bool started;
        bool ended;
        mapping(address => Participant) participants;
        address[] participants_list;

    }

    mapping(address => Tournament) tournaments;

    event TournamentAccepted(address account);

    event MoneySent(string _msg, address _address, uint _amount);

    constructor() public {
        // constructor
    }
    /**
    * Switch contract to test mode. Shouldn't use in real life
    */
    function testMode(bool _on) onlyOwner public {
        checkTimings = !_on;
    }
    /**
    * A function to initialize a tournament
    */
    function initTournament() payable public {
        require(msg.value >= minPrize + entryFee, "Transaction amount isn't enough");
        Tournament storage t = tournaments[msg.sender];
        if(t.exists && t.ended) {
            delete tournaments[msg.sender];
            t = tournaments[msg.sender];
        }
        require(t.exists == false, "Tournament already exists");
        t.startAt = now + 120 * 60;
        t.endAt = now + 120 * 60 + 24 * 60 * 60;
        t.amount = msg.value;
        t.exists = true;
        emit TournamentAccepted(msg.sender);
    }
    /**
    * A function to get a tournament
    */
    function getTournament(address tournamentOwner) constant public returns (uint, uint, uint, bool, bool, bool, address[]) {
        Tournament storage t = tournaments[tournamentOwner];
        return (t.amount, t.startAt, t.endAt, t.exists, t.started, t.ended, t.participants_list);
    }
    /**
    * A function to participate in the tournament
    */
    function participateTournament(address tournamentOwner) public {
        Tournament storage t = tournaments[tournamentOwner];
        require(t.exists == true, "Tournament doesn't exist");
        if (checkTimings) {
            require(t.started == false, "Tournament is already started");
        }
        //require(now < t.startAt, "Tournament is already started (by time)");
        //require(tournaments[tournamentOwner].participants[msg.sender].exists == false, "You're already participating it");
        t.participants[msg.sender].exists = true;
        t.participants_list.push(msg.sender);
    }
    /** A function for starting of tournament
     * initialScores - an array of scores of participants in exact same order as in participians_list
     */
    function startTournament(address tournamentOwner, uint32[] initialScores) onlyOwner public {
        Tournament storage t = tournaments[tournamentOwner];
        require(t.exists == true, "Tournament doesn't exist");
        if (checkTimings) {
            require(now > t.startAt, "Tournament can be started only after start time");
        }
        require(t.started == false, "Tournament is already started");
        require(initialScores.length == t.participants_list.length,
            "Number of initial scores must be equal a number of tournament participants");
        for (uint16 i = 0; i < initialScores.length; i++) {
            t.participants[t.participants_list[i]].initialScore = initialScores[i];
        }
        t.started = true;
    }

    function getParticipantInfo(address tournamentOwner, address participant) constant public returns (int64 initialScore, int64 finalScore, int64 result, uint prize) {
        Tournament storage t = tournaments[tournamentOwner];
        require(t.exists, "Tournament doesn't exist");
        Participant storage p = t.participants[participant];
        require(p.exists, "Participant does not exists");
        return (p.initialScore, p.initialScore + p.result, p.result, p.prize);
    }

    /** A function for ending of tournament
     * finalScores - an array of scores of participants in exact same order as in participians_list
     */
    function endTournament(address tournamentOwner, uint32[] finalScores) onlyOwner public {
        Tournament storage t = tournaments[tournamentOwner];
        require(t.exists == true, "Tournament doesn't exist");
        require(t.started == true, "Tournament isn't started");
        if(checkTimings) {
            require(now > t.endAt, "Tournament can be ended only after end time");
        }
        require(t.ended == false, "Tournament is already ended");
        require(finalScores.length == t.participants_list.length, "Number of final scores must be equal a number of tournament participants");
        uint i;
        for (i = 0; i < finalScores.length; i++) {
            Participant storage p = t.participants[t.participants_list[i]];
            p.result = finalScores[i] - p.initialScore;
        }
        t.ended = true;

        owner.transfer(entryFee);

        uint prize = t.amount - entryFee;

        if (t.participants_list.length == 0) {
            tournamentOwner.transfer(prize);
            emit MoneySent("Sent money back to organizer because there wasn't any participant", tournamentOwner, prize);
            return;
        }

        /* sort */
        uint n = t.participants_list.length;
        address[] memory arr = new address[](n);

        for (i = 0; i < n; i++) {
            arr[i] = t.participants_list[i];
        }

        address key;
        uint j;

        for (i = 1; i < arr.length; i++) {
            key = arr[i];

            for (j = i; j > 0 && t.participants[arr[j - 1]].result < t.participants[key].result; j--) {
                arr[j] = arr[j - 1];
            }

            arr[j] = key;
        }

        for (i = 0; i < n; i++) {
            t.participants_list[i] = arr[i];
        }
        /* end of sort */

        //calculate results and send prizes
        if (t.participants_list.length == 1) {
            t.participants_list[0].transfer(prize);
            t.participants[t.participants_list[0]].prize = prize;
            emit MoneySent("Sent all prize to only participant", t.participants_list[0], prize);
            return;
        }
        uint prize1 = prize - prize / 3;
        t.participants_list[0].transfer(prize1);
        t.participants[t.participants_list[0]].prize = prize1;
        emit MoneySent("Sent prize to winner", t.participants_list[0], prize1);
        prize -= prize1;
        if (t.participants_list.length == 2) {
            t.participants_list[1].transfer(prize);
            t.participants[t.participants_list[1]].prize = prize;
            emit MoneySent("Sent prize to 2nd place (only 2 participants there)", t.participants_list[1], prize);
            return;
        }
        uint prize3 = prize / 3;
        uint prize2 = prize - prize3;
        t.participants_list[1].transfer(prize2);
        t.participants[t.participants_list[1]].prize = prize2;
        emit MoneySent("Sent prize to 2nd place", t.participants_list[1], prize2);
        t.participants_list[2].transfer(prize3);
        t.participants[t.participants_list[2]].prize = prize3;
        emit MoneySent("Sent prize to 3nd place", t.participants_list[2], prize3);
    }
}
