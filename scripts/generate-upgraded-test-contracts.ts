// See README.md for more details

import * as fs from "fs";
import * as path from "path";

const inputDirectory = "./contracts"; // path to your contracts directory
const outputDirectory = "./contracts/test"; // path to your output directory

fs.readdir(inputDirectory, (err, files) => {
  if (err) {
    return console.log("Unable to scan directory: " + err);
  }

  // First pass: Generate all the upgraded contract names
  const upgradedNames = files
    .filter(file => path.extname(file) === ".sol")
    .map(file => "TestUpgraded" + path.basename(file, ".sol"));

  console.log("To add to UTT.test.ts (remove lines for non-upgradable contracts such as Operator.sol, UTTProxy.sol):");

  // Second pass: Replace the imports and contract names in all files
  files.forEach((file) => {
    if (path.extname(file) === ".sol") {
      const filePath = path.join(inputDirectory, file);
      const data = fs.readFileSync(filePath, "utf8");

      const name = path.basename(file, ".sol");
      const upgradedName = "TestUpgraded" + name;

      let upgradedData = data;

      // Replace all import statements
      upgradedNames.forEach((upgradedName) => {
        const originalName = upgradedName.replace("TestUpgraded", "");
        upgradedData = upgradedData.replace(new RegExp(`import ".*/${originalName}.sol";`, "g"), `import "./${upgradedName}.sol";`);
        upgradedData = upgradedData.replace(new RegExp(`\\b${originalName}\\b`, "g"), upgradedName);
      });

      const newVarName = `new${upgradedName}Var`;
      const gapMatch = upgradedData.match(/uint256\[(\d+)\] private __gap;/);
      if (gapMatch) {
        const gapLength = Number(gapMatch[1]); // The first matched group is at index 1
        const newGapLength = gapLength - 1;
        upgradedData = upgradedData.replace(gapMatch[0], `uint256 ${newVarName};\n    uint256[${newGapLength}] private __gap;\n\n    function increment${newVarName}() public {\n        ${newVarName} += 1;\n    }\n\n    function get${newVarName}() public view returns (uint256) {\n        return ${newVarName};\n    }`);
      }

      console.log(`\n    upgradedContract.increment${newVarName}();`);
      console.log(`    expect(await upgradedContract.get${newVarName}()).to.be.eq(1);`);

      fs.writeFileSync(`${outputDirectory}/${upgradedName}.sol`, upgradedData);
    }
  });
});
