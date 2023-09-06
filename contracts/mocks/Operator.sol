// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@chainlink/contracts/src/v0.7/Operator.sol";


contract UTUOperator is Operator {
    constructor(address link) Operator(link, msg.sender) {}
}
