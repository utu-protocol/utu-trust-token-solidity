import { hexlify, toUtf8Bytes } from "ethers";

const COMPACT_JOB_ID_PATTERN = /^[0-9a-fA-F]{32}$/;
const UUID_JOB_ID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function normalizeExternalJobId(jobId: string): string {
  if (
    !COMPACT_JOB_ID_PATTERN.test(jobId) &&
    !UUID_JOB_ID_PATTERN.test(jobId)
  ) {
    throw new Error(
      "External job ID must be a UUID or a 32-character hexadecimal string"
    );
  }

  return jobId.replace(/-/g, "").toLowerCase();
}

/** Mirrors UTTProxy.stringToBytes32 for a normalized 32-character job id. */
export function externalJobIdToBytes32(jobId: string): string {
  return hexlify(toUtf8Bytes(normalizeExternalJobId(jobId)));
}
