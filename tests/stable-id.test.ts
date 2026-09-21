import assert from "node:assert/strict";
import test from "node:test";

import { createStableId } from "../src/lib/stable-id.ts";

type CryptoOverride = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

async function withCrypto(cryptoOverride: CryptoOverride, callback: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: cryptoOverride,
  });

  try {
    callback();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else delete (globalThis as { crypto?: Crypto }).crypto;
  }
}

test("uses native crypto.randomUUID when available", async () => {
  const expected = "00000000-0000-4000-8000-000000000000";
  await withCrypto({ randomUUID: () => expected }, () => {
    assert.equal(createStableId(), expected);
  });
});

test("falls back to crypto.getRandomValues with an RFC-compatible UUID v4", async () => {
  const source = Uint8Array.from([
    0x00, 0x11, 0x22, 0x33,
    0x44, 0x55, 0x06, 0x77,
    0x88, 0x99, 0xaa, 0xbb,
    0xcc, 0xdd, 0xee, 0xff,
  ]);

  await withCrypto({
    getRandomValues: (array) => {
      array.set(source);
      return array;
    },
  }, () => {
    const id = createStableId();
    assert.equal(id, "00112233-4455-4677-8899-aabbccddeeff");
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(id[14], "4");
    assert.match(id[19], /[89ab]/);
  });
});

test("fails explicitly when no secure random source exists", async () => {
  await withCrypto({}, () => {
    assert.throws(
      () => createStableId(),
      /requires a secure random source for stable IDs/,
    );
  });
});
