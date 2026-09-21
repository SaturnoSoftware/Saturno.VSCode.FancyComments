import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { GetIndentColumn } from "../Source/Core/Formatting";

describe("GetIndentColumn", () => {
  it("returns cursor position for empty line", () => {
    assert.strictEqual(GetIndentColumn("", 4), 4);
  });

  it("returns cursor position for whitespace-only line", () => {
    assert.strictEqual(GetIndentColumn("    ", 4), 4);
  });

  it("returns indentation length for line with content", () => {
    assert.strictEqual(GetIndentColumn("    hello", 0), 4);
  });

  it("returns 0 for line with no indentation", () => {
    assert.strictEqual(GetIndentColumn("hello", 0), 0);
  });

  it("returns tab-based indentation count", () => {
    assert.strictEqual(GetIndentColumn("\t\thello", 0), 2);
  });

  it("ignores cursor position when line has content", () => {
    assert.strictEqual(GetIndentColumn("  code", 10), 2);
  });
});
