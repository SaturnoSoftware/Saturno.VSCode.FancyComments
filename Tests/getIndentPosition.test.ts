import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  BuildCommentBlockTailWithSeparator,
  BuildCommentLine,
  CommentSyntax,
  DEFAULT_CONFIG,
  GetIndentPosition,
} from "../Source/Core/Formatting";

const cStyleSyntax: CommentSyntax = {
  singleLineStart: "//",
  singleLineEnd: "",
  multiLineStart: "/*",
  multiLineMiddle: "*",
  multiLineEnd: "*/",
};

describe("GetIndentPosition", () => {
  it("returns both columns as zero for an empty line", () => {
    assert.deepStrictEqual(GetIndentPosition("", 0), { character: 0, visualColumn: 0 });
  });

  it("clamps the character position for an empty line", () => {
    assert.deepStrictEqual(GetIndentPosition("", 4), { character: 0, visualColumn: 0 });
  });

  it("returns the character and visual position for a spaces-only line", () => {
    assert.deepStrictEqual(GetIndentPosition("    ", 4), { character: 4, visualColumn: 4 });
  });

  it("returns the leading spaces before content", () => {
    assert.deepStrictEqual(GetIndentPosition("    hello", 0), { character: 4, visualColumn: 4 });
  });

  it("returns zero indentation before content", () => {
    assert.deepStrictEqual(GetIndentPosition("hello", 0), { character: 0, visualColumn: 0 });
  });

  it("expands tabs in content indentation to their visual stops", () => {
    assert.deepStrictEqual(GetIndentPosition("\t\thello", 0), { character: 2, visualColumn: 8 });
  });

  it("ignores the cursor position when content follows indentation", () => {
    assert.deepStrictEqual(GetIndentPosition("  code", 10), { character: 2, visualColumn: 2 });
  });

  it("expands a tab before the cursor on a blank line", () => {
    assert.deepStrictEqual(GetIndentPosition("\t", 1), { character: 1, visualColumn: 4 });
  });

  it("measures only the tab before the cursor on a blank line", () => {
    assert.deepStrictEqual(GetIndentPosition("\t\t  ", 1), { character: 1, visualColumn: 4 });
  });

  it("expands multiple tabs through their visual stops", () => {
    assert.deepStrictEqual(GetIndentPosition("\t\t", 2), { character: 2, visualColumn: 8 });
  });

  it("advances a tab to the next stop after preceding spaces", () => {
    assert.deepStrictEqual(GetIndentPosition(" \t", 2), { character: 2, visualColumn: 4 });
  });

  it("ignores whitespace after the cursor on a blank line", () => {
    assert.deepStrictEqual(GetIndentPosition("\t  ", 1), { character: 1, visualColumn: 4 });
  });

  it("expands tabs and spaces in mixed content indentation", () => {
    assert.deepStrictEqual(GetIndentPosition("  \t  code", 0), { character: 5, visualColumn: 6 });
  });

  it("clamps a negative cursor position on a blank line", () => {
    assert.deepStrictEqual(GetIndentPosition("    ", -2), { character: 0, visualColumn: 0 });
  });

  it("clamps a cursor past a blank line to its text length", () => {
    assert.deepStrictEqual(GetIndentPosition("  ", 20), { character: 2, visualColumn: 2 });
  });

  it("counts non-breaking spaces as indentation columns", () => {
    assert.deepStrictEqual(GetIndentPosition("\u00A0\u00A0code", 0), { character: 2, visualColumn: 2 });
  });

  it("handles a long spaces-only indentation", () => {
    assert.deepStrictEqual(GetIndentPosition(" ".repeat(1000), 1000), { character: 1000, visualColumn: 1000 });
  });

  it("uses the editor tab size when it differs from four", () => {
    assert.deepStrictEqual(GetIndentPosition("\t\tcode", 0, 2), { character: 2, visualColumn: 4 });
  });

  it("uses tab stops after spaces with a custom tab size", () => {
    assert.deepStrictEqual(GetIndentPosition(" \tcode", 0, 8), { character: 2, visualColumn: 8 });
  });

  it("keeps a tab-indented separator at the configured visual width", () => {
    const position = GetIndentPosition("\t", 1, 4);
    const separator = BuildCommentLine(cStyleSyntax, "", DEFAULT_CONFIG, position.visualColumn);
    assert.strictEqual(position.visualColumn + separator.length, DEFAULT_CONFIG.lineWidth);
  });

  it("keeps a multiline separator aligned after retained tab indentation", () => {
    const position = GetIndentPosition("\t", 1, 4);
    const replacement = BuildCommentBlockTailWithSeparator(
      cStyleSyntax,
      "\t",
      "",
      DEFAULT_CONFIG,
      position.visualColumn
    );
    const separatorLine = replacement.split("\n").at(-1) ?? "";
    assert.strictEqual(position.visualColumn + separatorLine.slice(1).length, DEFAULT_CONFIG.lineWidth);
  });

  it("falls back to four columns for an invalid tab size", () => {
    assert.deepStrictEqual(GetIndentPosition("\t", 1, 0), { character: 1, visualColumn: 4 });
  });
});
