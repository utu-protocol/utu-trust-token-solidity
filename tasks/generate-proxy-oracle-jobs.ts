// eslint-disable-next-line node/no-unpublished-import
import { task } from "hardhat/config";
import fs from "fs";
import Handlebars from "handlebars";

task("generate-proxy-oracle-jobs", "Generate Chainlink job definitions for a UTTProxy from templates.")
  .setAction(async (taskArgs: any, hre: any) => {

    createJobDefinition("utt-proxy-endorse", hre.network.name);
    createJobDefinition("utt-proxy-claim-rewards", hre.network.name);
  });

function createJobDefinition(templateBaseName: string, network: string) {
    const templateFile = fs.readFileSync(`${__dirname}/chainlink-jobs/templates/${templateBaseName}.toml.hbs`, "utf8");
    const values = JSON.parse(fs.readFileSync(`${__dirname}/chainlink-jobs/values/${network}.json`, "utf8"));

    // Compile and populate the template
    const template = Handlebars.compile(templateFile);
    const populatedTemplate = template({ ...values, network: network });

    // Write the populated TOML to a new file
    fs.writeFileSync(
      `${__dirname}/chainlink-jobs/generated/${templateBaseName}.${network}.toml`,
      populatedTemplate
    );
}
