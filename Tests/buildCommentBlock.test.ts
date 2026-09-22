import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { BuildCommentBlock, CommentSyntax } from "../Source/Core/Formatting";

const cStyleSyntax: CommentSyntax = {
  singleLineStart: "//",
  singleLineEnd: "",
  multiLineStart: "/*",
  multiLineMiddle: "*",
  multiLineEnd: "*/",
};

const htmlStyleSyntax: CommentSyntax = {
  singleLineStart: "<!--",
  singleLineEnd: "-->",
  multiLineStart: "<!--",
  multiLineMiddle: " ",
  multiLineEnd: "-->",
};

const rawHashSyntax: CommentSyntax = {
  singleLineStart: "#",
  singleLineEnd: "",
  multiLineStart: "#",
  multiLineMiddle: "#",
  multiLineEnd: "#",
};

describe("BuildCommentBlock", () => {
  it("produces a 3-line block for C-style with text", () => {
    const result = BuildCommentBlock(cStyleSyntax, "", "Section");
    const lines = result.split("\n");
    assert.strictEqual(lines.length, 3);
    assert.strictEqual(lines[0], "/*");
    assert.strictEqual(lines[1], "* Section");
    assert.strictEqual(lines[2], "*/");
  });

  it("produces a 3-line block for C-style with empty text", () => {
    const result = BuildCommentBlock(cStyleSyntax, "", "");
    const lines = result.split("\n");
    assert.strictEqual(lines.length, 3);
    assert.strictEqual(lines[0], "/*");
    assert.strictEqual(lines[1], "* ");
    assert.strictEqual(lines[2], "*/");
  });

  it("respects indentation in middle and end lines", () => {
    const result = BuildCommentBlock(cStyleSyntax, "    ", "Hello");
    const lines = result.split("\n");
    assert.strictEqual(lines[0], "    /*");
    assert.strictEqual(lines[1], "    * Hello");
    assert.strictEqual(lines[2], "    */");
  });

  it("works with HTML-style syntax", () => {
    const result = BuildCommentBlock(htmlStyleSyntax, "", "Title");
    const lines = result.split("\n");
    assert.strictEqual(lines.length, 3);
    assert.strictEqual(lines[0], "<!--");
    assert.strictEqual(lines[1], "  Title");
    assert.strictEqual(lines[2], "-->");
  });

  it("normalizes raw single-character block markers to doubled fences", () => {
    const result = BuildCommentBlock(rawHashSyntax, "", "Title");
    const lines = result.split("\n");
    assert.strictEqual(lines.length, 3);
    assert.strictEqual(lines[0], "##");
    assert.strictEqual(lines[1], "## Title");
    assert.strictEqual(lines[2], "##");
  });

  it("trims text input", () => {
    const result = BuildCommentBlock(cStyleSyntax, "", "  spaces  ");
    const lines = result.split("\n");
    assert.strictEqual(lines[1], "* spaces");
  });

  it("handles large indentation", () => {
    const indent = " ".repeat(20);
    const result = BuildCommentBlock(cStyleSyntax, indent, "deep");
    const lines = result.split("\n");
    assert.ok(lines[1].startsWith(indent));
    assert.ok(lines[2].startsWith(indent));
  });
});

describe("BuildCommentBlock release regressions", () => {
  it("keeps the opening delimiter aligned with spaces, tabs, and mixed indentation", () => {
    for (const indent of ["  ", "\t", " \t  "]) {
      const lines = BuildCommentBlock(cStyleSyntax, indent, "Section").split("\n");
      assert.deepStrictEqual(lines, [`${indent}/*`, `${indent}* Section`, `${indent}*/`]);
    }
  });

  it("emits one middle line per input line without losing embedded indentation", () => {
    const lines = BuildCommentBlock(cStyleSyntax, "  ", "First\n  Second\n\tThird").split("\n");
    assert.deepStrictEqual(lines, ["  /*", "  * First", "  *   Second", "  * \tThird", "  */"]);
  });
});
