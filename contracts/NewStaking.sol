// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
contract staking is Ownable {
    ERC20 public stakingToken;
    struct Stake {
        uint256 tokenAmount;
        uint256 startTime;
        uint256 stakingType;
        address user;
        uint256 id;
        uint256 unlockStartTime;
        bool finished;
    }
    uint256[] public period = [
        0 days,
        1 * 30 days,
        3 * 30 days,
        6 * 30 days,
        12 * 30 days
    ];
    uint256[] public APR = [30, 42, 60, 90, 120];
    uint256[] public TIER = [1000, 5000, 20000, 50000, 100000, 250000];
    uint256[] public Multiplier = [0, 10, 12, 15, 20];
    uint256 public base = 1000;
    Stake[] public stakes;
    uint256 public totalNumberOfStake;
    bool public isOpen;

    event Deposit(address user, uint256 amount, uint256 stakingType);
    event Withdraw(uint256 id, uint256 rewardAmount);
    event Restake(uint256 id, uint256 stakingType);

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = ERC20(_stakingToken);
        totalNumberOfStake = 0;
    }

    function init(uint256 _amount) external onlyOwner {
        require(!isOpen, "already initilized");
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        isOpen = true;
    }

    function deposit(uint256 _amount, uint256 _stakingType) external {
        require(isOpen, "Deposit not available");
        require(_amount > 0, "Cannot stake 0");
        stakes.push(
            Stake({
                tokenAmount: _amount,
                startTime: block.timestamp,
                stakingType: _stakingType,
                user: msg.sender,
                id: totalNumberOfStake,
                unlockStartTime: 0,
                finished: false
            })
        );
        totalNumberOfStake++;
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        emit Deposit(msg.sender, _amount, _stakingType);
    }

    function activeUnlock(uint256 _id) external {
        Stake storage cur = stakes[_id];
        require(!cur.finished, "finished");
        require(cur.user == msg.sender, "mismatch owner");
        require(cur.unlockStartTime == 0, "already active");
        uint256 _days = block.timestamp - cur.startTime;
        if (cur.stakingType != 0) {
            require(_days > period[cur.stakingType], "not reached lock time");
        }
        cur.unlockStartTime = block.timestamp;
    }

    function withdraw(uint256 _id) external {
        Stake storage cur = stakes[_id];
        require(!cur.finished, "finished");
        require(cur.user == msg.sender, "not owner");
        uint256 rewardAmount = calculateReward(_id);
        require(rewardAmount > 0, "low amount");
        cur.finished = true;
        stakingToken.transfer(msg.sender, cur.tokenAmount + rewardAmount);
        emit Withdraw(_id, rewardAmount);
    }

    function restake(uint256 _id, uint256 _stakingType) external {
        Stake storage cur = stakes[_id];
        require(!cur.finished, "finished");
        require(cur.user == msg.sender, "not owner");
        uint256 rewardAmount = calculateReward(_id);
        require(rewardAmount > 0, "low amount");
        cur.stakingType = _stakingType;
        cur.startTime = block.timestamp;
        cur.tokenAmount += rewardAmount;
        cur.unlockStartTime = 0;
        emit Restake(_id, _stakingType);
    }

    function getStakedIdsByOwner(
        address _owner
    ) public view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](totalNumberOfStake);
        uint256 count = 0;
        for (uint256 i = 0; i < totalNumberOfStake; i++) {
            Stake storage cur = stakes[i];
            if (cur.user == _owner && !cur.finished) {
                ids[count] = i;
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 j = 0; j < count; j++) {
            result[j] = ids[j];
        }
        return result;
    }

    function calculateLaunchpadTier(
        uint256 _id
    ) public view returns (uint256 _step) {
        Stake storage cur = stakes[_id];
        if (cur.stakingType == 0) {
            return 0;
        }
        uint256 amount = (cur.tokenAmount * Multiplier[cur.stakingType]) / 10;
        _step = 0;
        for (uint256 i = 0; i < TIER.length; i++) {
            if (amount >= TIER[i] * 10 ** stakingToken.decimals())
                _step = i + 1;
        }
    }

    function calculateReward(uint256 _id) public view returns (uint256) {
        Stake storage cur = stakes[_id];
        if (cur.finished) return 0;
        if (block.timestamp - cur.unlockStartTime < 7 days) {
            return 0;
        }
        uint256 rewardTime = period[cur.stakingType];
        uint256 _days = block.timestamp - cur.startTime - 7 days;
        if (cur.stakingType == 0) {
            rewardTime = _days;
        }
        return
            cur.tokenAmount *
                (rewardTime *
                    APR[cur.stakingType] +
                    (_days - rewardTime) *
                    APR[0]) / (365 days * base);
    }
}
