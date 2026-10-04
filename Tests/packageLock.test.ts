import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"));

describe("dependency lock contract", () => {
  it("keeps the package version and TypeScript pin aligned with the lockfile", () => {
    assert.strictEqual(packageLock.version, packageJson.version);
    assert.strictEqual(packageLock.packages[""].version, packageJson.version);
    assert.strictEqual(
      packageLock.packages[""].devDependencies.typescript,
      packageJson.devDependencies.typescript
    );
    assert.strictEqual(
      packageLock.packages["node_modules/typescript"].version,
      packageJson.devDependencies.typescript
    );
  });
});
