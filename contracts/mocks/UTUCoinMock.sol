pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UTUCoinMock is ERC20 {
    constructor(address initialHolder, uint256 initialSupply) ERC20("UTUCoinMock", "UTUM") {
        _mint(initialHolder, initialSupply);
    }
}
