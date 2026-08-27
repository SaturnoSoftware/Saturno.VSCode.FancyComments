import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { getIndentColumn } from "../src/formatting";

describe("getIndentColumn", () => {
  it("returns cursor position for empty line", () => {
    assert.strictEqual(getIndentColumn("", 4), 4);
  });

  it("returns cursor position for whitespace-only line", () => {
    assert.strictEqual(getIndentColumn("    ", 4), 4);
  });

  it("returns indentation length for line with content", () => {
    assert.strictEqual(getIndentColumn("    hello", 0), 4);
  });

  it("returns 0 for line with no indentation", () => {
    assert.strictEqual(getIndentColumn("hello", 0), 0);
  });

  it("returns tab-based indentation count", () => {
    assert.strictEqual(getIndentColumn("\t\thello", 0), 2);
  });

  it("ignores cursor position when line has content", () => {
    assert.strictEqual(getIndentColumn("  code", 10), 2);
  });
});
