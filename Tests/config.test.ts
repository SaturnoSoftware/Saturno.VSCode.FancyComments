import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_EXTENSION_CONFIG, NormalizeConfig } from "../Source/Core/Config";

const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../..", "package.json"), "utf8"));

describe("separatorBlankLines configuration", () => {
  it("defaults to no blank line to preserve existing formatting", () => {
    assert.strictEqual(DEFAULT_EXTENSION_CONFIG.separatorBlankLines, 0);
    assert.strictEqual(NormalizeConfig({}).separatorBlankLines, 0);
  });

  it("accepts and normalizes configured blank-line counts", () => {
    assert.strictEqual(NormalizeConfig({ separatorBlankLines: 2 }).separatorBlankLines, 2);
    assert.strictEqual(NormalizeConfig({ separatorBlankLines: 2.9 }).separatorBlankLines, 2);
  });

  it("bounds hand-edited settings to the supported range", () => {
    assert.strictEqual(NormalizeConfig({ separatorBlankLines: -1 }).separatorBlankLines, 0);
    assert.strictEqual(NormalizeConfig({ separatorBlankLines: 99 }).separatorBlankLines, 20);
    assert.strictEqual(NormalizeConfig({ separatorBlankLines: Number.NaN }).separatorBlankLines, 0);
  });

  it("declares the setting in the VS Code configuration schema", () => {
    assert.deepStrictEqual(packageJson.contributes.configuration.properties[
      "saturno-fancy-comments.separatorBlankLines"
    ], {
      type: "integer",
      default: 0,
      minimum: 0,
      maximum: 20,
      description: "Number of blank lines between a multiline comment block and its separator line.",
    });
  });
});

describe("preferSingleLineComments configuration", () => {
  it("prefers line comments by default and accepts an explicit opt-out", () => {
    assert.strictEqual(DEFAULT_EXTENSION_CONFIG.preferSingleLineComments, true);
    assert.strictEqual(NormalizeConfig({}).preferSingleLineComments, true);
    assert.strictEqual(NormalizeConfig({ preferSingleLineComments: false }).preferSingleLineComments, false);
  });

  it("normalizes non-boolean settings to the safe default", () => {
    assert.strictEqual(
      NormalizeConfig({ preferSingleLineComments: "false" as unknown as boolean }).preferSingleLineComments,
      true
    );
  });

  it("declares the setting in the VS Code configuration schema", () => {
    assert.deepStrictEqual(packageJson.contributes.configuration.properties[
      "saturno-fancy-comments.preferSingleLineComments"
    ], {
      type: "boolean",
      default: true,
      description: "Use line-comment syntax for new multiline comment blocks when the language supports it; block-only languages continue to use block comments.",
    });
  });
});
