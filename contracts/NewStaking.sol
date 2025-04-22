// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Staking Contract
 * @dev A staking contract that allows users to stake ERC20 tokens and earn rewards based on staking duration and tier.
 * The contract supports multiple staking periods, APRs, and tiers with multipliers for rewards.
 */
contract Staking is Ownable {
    IERC20 public stakingToken; // The ERC20 token used for staking

    struct Stake {
        uint256 tokenAmount; // Amount of tokens staked
        uint256 startTime; // Timestamp when staking started
        uint256 stakingType; // Type of staking (0 = flexible, 1+ = locked)
        address user; // Address of the staker
        uint256 id; // Unique ID of the stake
        uint256 unlockStartTime; // Timestamp when unlock was initiated
        bool finished; // Whether the stake is withdrawn
    }

    // Staking periods in days (0 = flexible, 1 = 1 month, 3 = 3 months, etc.)
    uint256[] public stakingPeriods = [
        0 days,
        1 * 30 days,
        3 * 30 days,
        6 * 30 days,
        12 * 30 days
    ];

    // unlock period
    uint256 public unlockPeriod = 7 days;

    // Annual Percentage Rates (APR) for each staking type
    uint256[] public stakingAPRs = [30, 42, 60, 90, 120];

    // Multipliers for staking types (used for launchpad tier calculation)
    uint256[] public stakingMultipliers = [10, 12, 18, 24, 30];

    uint256 public constant BASE = 1000; // Base value for APR calculations

    Stake[] public stakes; // Array of all stakes
    uint256 public totalNumberOfStakes; // Total number of stakes created
    uint256 public totalAmountOfStakes; // Total amount of stakes
    bool public isOpen; // Whether staking is open
    uint256 public totalPaidRewards; // Total paid rewards
    uint256 public BASE_SCORE_VALUE = 1; // Base score value used as multiplier in score calculations

    mapping(uint256 => uint256) public rewards; // Mapping of stake ID to reward amount

    mapping(address => uint256) public rewardsPerUser; // Mapping of user address to their total reward amount

    mapping(uint8 => uint256) public tierScore; // Mapping of tier level (uint8) to its required score

    event Deposit(address indexed user, uint256 amount, uint256 stakingType);
    event Withdraw(uint256 indexed id, uint256 rewardAmount);
    event Restake(uint256 indexed id, uint256 stakingType);

    /**
     * @dev Constructor to initialize the staking contract.
     * @param _stakingToken Address of the ERC20 token used for staking.
     */
    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        totalNumberOfStakes = 0;
        totalAmountOfStakes = 0;
        tierScore[0] = 0;
        tierScore[1] = 50_000;
        tierScore[2] = 150_000;
        tierScore[3] = 250_000;
        tierScore[4] = 500_000;
    }

    /**
     * @dev Initializes the staking contract by transferring tokens to the contract.
     * @param _amount Amount of tokens to transfer.
     */
    function initialize(uint256 _amount) external onlyOwner {
        require(!isOpen, "Already initialized");
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        isOpen = true;
    }

    /**
     * @dev Allows a user to stake tokens.
     * @param _amount Amount of tokens to stake.
     * @param _stakingType Type of staking (0 = flexible, 1+ = locked).
     */
    function stakeTokens(
        uint256 _amount,
        address _user,
        uint256 _stakingType
    ) external {
        require(isOpen, "Staking is not available");
        require(_amount > 0, "Cannot stake 0 tokens");

        stakes.push(
            Stake({
                tokenAmount: _amount,
                startTime: block.timestamp,
                stakingType: _stakingType,
                user: _user,
                id: totalNumberOfStakes,
                unlockStartTime: 0,
                finished: false
            })
        );

        totalNumberOfStakes++;
        totalAmountOfStakes += _amount;
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        emit Deposit(msg.sender, _amount, _stakingType);
    }

    /**
     * @dev Initiates the unlock process for a locked stake.
     * @param _id ID of the stake to unlock.
     */
    function initiateUnlock(uint256 _id) external {
        Stake storage stake = stakes[_id];
        require(!stake.finished, "Stake already withdrawn");
        require(stake.user == msg.sender, "Not the stake owner");
        require(stake.unlockStartTime == 0, "Unlock already initiated");

        uint256 stakingDuration = block.timestamp - stake.startTime;
        if (stake.stakingType != 0) {
            require(
                stakingDuration > stakingPeriods[stake.stakingType],
                "Lock period not reached"
            );
        }
        stake.unlockStartTime = block.timestamp;
    }

    /**
     * @dev Allows a user to withdraw their stake and rewards.
     * @param _id ID of the stake to withdraw.
     */
    function withdrawStake(uint256 _id) external {
        Stake storage stake = stakes[_id];
        require(!stake.finished, "Stake already withdrawn");
        require(stake.user == msg.sender, "Not the stake owner");
        uint256 rewardAmount = calculateReward(_id);
        require(rewardAmount > 0, "Insufficient reward amount");
        stake.finished = true;
        require(
            stakingToken.balanceOf(address(this)) >=
                stake.tokenAmount + rewardAmount,
            "Not enough token in staking contract."
        );
        stakingToken.transfer(msg.sender, stake.tokenAmount + rewardAmount);
        rewards[_id] = rewardAmount;
        rewardsPerUser[msg.sender] += rewardAmount;
        totalPaidRewards += rewardAmount;
        totalAmountOfStakes -= stake.tokenAmount;
        emit Withdraw(_id, rewardAmount);
    }

    /**
     * @dev Allows a user to restake their rewards into a new stake.
     * @param _id ID of the stake to restake.
     * @param _stakingType New staking type for the restake.
     */
    function restakeRewards(uint256 _id, uint256 _stakingType) external {
        Stake storage stake = stakes[_id];
        require(!stake.finished, "Stake already withdrawn");
        require(stake.user == msg.sender, "Not the stake owner");
        uint256 rewardAmount = calculateReward(_id);
        require(rewardAmount > 0, "Insufficient reward amount");
        stake.stakingType = _stakingType;
        stake.startTime = block.timestamp;
        stake.tokenAmount += rewardAmount;
        stake.unlockStartTime = 0;
        totalAmountOfStakes += rewardAmount;
        emit Restake(_id, _stakingType);
    }

    /**
     * @dev Returns the list of stake IDs owned by a specific address.
     * @param _owner Address of the staker.
     * @return Array of stake IDs.
     */
    function getStakeIdsByOwner(
        address _owner
    ) public view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](totalNumberOfStakes);
        uint256 count = 0;
        for (uint256 i = 0; i < totalNumberOfStakes; i++) {
            Stake storage stake = stakes[i];
            if (stake.user == _owner) {
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

    /**
     * @dev Calculates the reward for a specific stake.
     * @param _id ID of the stake.
     * @return Reward amount.
     */
    function calculateReward(uint256 _id) public view returns (uint256) {
        Stake storage stake = stakes[_id];
        if (stake.finished) return 0;
        require(
            block.timestamp - stake.unlockStartTime >= unlockPeriod &&
                stake.unlockStartTime > 0,
            "not reached unlock period"
        );
        uint256 rewardTime = stakingPeriods[stake.stakingType];
        uint256 stakingDuration = block.timestamp -
            stake.startTime -
            unlockPeriod;

        if (stake.stakingType == 0) {
            rewardTime = stakingDuration;
        }
        return
            (stake.tokenAmount *
                (rewardTime *
                    stakingAPRs[stake.stakingType] +
                    (stakingDuration - rewardTime) *
                    stakingAPRs[0])) / (365 days * BASE);
    }

    /**
     * @dev Returns the total number of stakes in the contract.
     * @return Total number of stakes.
     */
    function getTotalStakes() public view returns (uint256) {
        return totalNumberOfStakes;
    }

    /**
     * @dev Returns the details of a specific stake.
     * @param _id ID of the stake.
     * @return Stake details.
     */
    function getStakeDetails(uint256 _id) public view returns (Stake memory) {
        return stakes[_id];
    }

    /**
     * @dev Sets the score required for a specific tier level.
     * @param _tier The tier level to set score.
     * @param _score The score value to set for the tier.
     * @notice Only callable by contract owner.
     */
    function setTierScore(uint8 _tier, uint256 _score) external onlyOwner {
        tierScore[_tier] = _score;
    }

    /**
     * @dev Sets the base score value used in total score calculations.
     * @param _newValue The new base score value to use.
     * @notice Only callable by contract owner.
     */
    function setBaseScoreValue(uint256 _newValue) external onlyOwner {
        BASE_SCORE_VALUE = _newValue;
    }

    /**
     * @dev Calculates and returns the total score for a given owner.
     * @param _owner Address of the user to calculate score for.
     * @return totalScore The calculated total score based on user's stakes.
     * @notice Score is calculated as: sum of (tokenAmount * BASE_SCORE_VALUE * stakingMultiplier / 100) for all stakes.
     */
    function getTotalScore(address _owner) public view returns (uint256) {
        uint256[] memory ids = getStakeIdsByOwner(_owner);
        uint256 totalScore = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            Stake storage stake = stakes[i];
            totalScore +=
                (stake.tokenAmount *
                    BASE_SCORE_VALUE *
                    stakingMultipliers[stake.stakingType]) /
                100;
        }
        return totalScore;
    }
}
