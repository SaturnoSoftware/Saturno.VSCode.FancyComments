import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../..", "package.json"), "utf8"));
const readme = readFileSync(resolve(__dirname, "../..", "README.md"), "utf8");
const settings = Object.keys(packageJson.contributes.configuration.properties) as string[];

describe("README configuration copy", () => {
  for (const settingKey of settings) {
    const settingName = settingKey.slice(settingKey.lastIndexOf(".") + 1);

    it(`documents ${settingName} in the example and settings table`, () => {
      assert.ok(readme.includes(`"${settingKey}"`), `README example is missing ${settingKey}`);
      assert.ok(readme.includes(`| \`${settingName}\` |`), `README table is missing ${settingName}`);
    });
  }
});
