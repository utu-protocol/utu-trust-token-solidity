import { expect } from "chai";

import {
  externalJobIdToBytes32,
  normalizeExternalJobId,
} from "../scripts/rollout/job-id";

describe("set-action-job-id task", function () {
  it("should retain a compact external job ID", function () {
    expect(
      normalizeExternalJobId("e04102f0ecb5456fa6012fe61cd0457b")
    ).to.equal("e04102f0ecb5456fa6012fe61cd0457b");
  });

  it("should normalize a UUID external job ID", function () {
    expect(
      normalizeExternalJobId("a4a83c5b-0851-4dd7-8271-c5c0e1eb528c")
    ).to.equal("a4a83c5b08514dd78271c5c0e1eb528c");
  });

  it("should reject an invalid external job ID", function () {
    expect(() => normalizeExternalJobId("invalid-job-id")).to.throw(
      "External job ID must be a UUID or a 32-character hexadecimal string"
    );
  });

  it("should encode the compact id exactly as UTTProxy.stringToBytes32", function () {
    expect(
      externalJobIdToBytes32("a9ffd71b-7f67-4f14-bc71-f78063204450")
    ).to.equal(
      "0x6139666664373162376636373466313462633731663738303633323034343530"
    );
  });
});
