// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/operatorforwarder/dev/Operator.sol";


contract UTUOperator is Operator {
    constructor(address link) Operator(link, msg.sender) {}
}
