/**
 * Create a cryptographically secure RFC 4122 version 4 UUID.
 *
 * Browsers may expose getRandomValues without exposing randomUUID (for
 * example, when the page is not in a secure context), so the latter is an
 * optimization rather than a requirement.
 */
export function createStableId(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new Error("Resume Studio requires a secure random source for stable IDs.");
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").replace(
    /^(........)(....)(....)(....)(............)$/,
    "$1-$2-$3-$4-$5",
  );
}
