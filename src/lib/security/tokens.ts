import crypto from "crypto";

/**
 * Generate a cryptographically-random, URL-safe, unguessable token
 * for public tracking links. 32 bytes => 256 bits of entropy.
 */
export function generateTrackingToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** SHA-256 hex digest (used for non-reversible lookups, e.g. Gravatar). */
export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** MD5 hex digest — only used for the Gravatar public avatar API. */
export function md5Hex(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}
