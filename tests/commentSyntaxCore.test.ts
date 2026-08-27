import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { resolveCommentSyntaxFromComments } from "../libs/Saturno.VSCodeKit/src/CommentSyntaxCore";

describe("resolveCommentSyntaxFromComments", () => {
  it("returns null for undefined comment configuration", () => {
    assert.strictEqual(resolveCommentSyntaxFromComments(undefined), null);
  });

  it("preserves one-character line comments", () => {
    const syntax = resolveCommentSyntaxFromComments({ lineComment: "#" });

    assert.deepStrictEqual(syntax, {
      singleLineStart: "#",
      singleLineEnd: "",
      multiLineStart: "#",
      multiLineMiddle: "#",
      multiLineEnd: "#",
    });
  });

  it("preserves one-character block comment delimiters", () => {
    const syntax = resolveCommentSyntaxFromComments({ blockComment: ["{", "}"] });

    assert.deepStrictEqual(syntax, {
      singleLineStart: "{",
      singleLineEnd: "}",
      multiLineStart: "{",
      multiLineMiddle: "{",
      multiLineEnd: "}",
    });
  });

  it("uses block comment open and close tokens when no line comment is available", () => {
    const syntax = resolveCommentSyntaxFromComments({ blockComment: ["<!--", "-->"] });

    assert.deepStrictEqual(syntax, {
      singleLineStart: "<!--",
      singleLineEnd: "-->",
      multiLineStart: "<!--",
      multiLineMiddle: "-",
      multiLineEnd: "-->",
    });
  });

  it("uses line comments before block comments when both exist", () => {
    const syntax = resolveCommentSyntaxFromComments({
      lineComment: "//",
      blockComment: ["/*", "*/"],
    });

    assert.strictEqual(syntax?.singleLineStart, "//");
    assert.strictEqual(syntax?.singleLineEnd, "");
  });

  it("returns null for missing comment configuration", () => {
    assert.strictEqual(resolveCommentSyntaxFromComments({}), null);
    assert.strictEqual(resolveCommentSyntaxFromComments(null), null);
  });
});
