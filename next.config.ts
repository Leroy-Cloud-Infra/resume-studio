import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const BUILD_FINGERPRINT_ROOTS = [
  "src",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "postcss.config.mjs",
];

function collectFingerprintFiles(relativePath: string): string[] {
  const absolutePath = join(process.cwd(), relativePath);

  if (!existsSync(absolutePath)) {
    return [];
  }

  if (statSync(absolutePath).isFile()) {
    return [relativePath];
  }

  return readdirSync(absolutePath, { withFileTypes: true })
    .filter((entry) => entry.name !== "node_modules" && entry.name !== ".next")
    .flatMap((entry) => collectFingerprintFiles(join(relativePath, entry.name)));
}

function getBuildFingerprint() {
  const hash = createHash("sha256");
  const files = [...new Set(BUILD_FINGERPRINT_ROOTS.flatMap(collectFingerprintFiles))].sort();

  for (const file of files) {
    hash.update(`${file}\0`);
    hash.update(readFileSync(join(process.cwd(), file)));
    hash.update("\0");
  }

  return hash.digest("hex").slice(0, 8);
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_RESUME_STUDIO_BUILD_ID: getBuildFingerprint(),
  },
};

export default nextConfig;
