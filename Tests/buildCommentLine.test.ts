import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { BuildCommentLine, CommentSyntax, FormattingConfig, DEFAULT_CONFIG } from "../Source/Core/Formatting";

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

const hashSyntax: CommentSyntax = {
  singleLineStart: "##",
  singleLineEnd: "",
  multiLineStart: "##",
  multiLineMiddle: "##",
  multiLineEnd: "##",
};

const rawHashSyntax: CommentSyntax = {
  singleLineStart: "#",
  singleLineEnd: "",
  multiLineStart: "#",
  multiLineMiddle: "#",
  multiLineEnd: "#",
};

describe("BuildCommentLine", () => {
  it("produces an 80-char line for C-style with no text", () => {
    const result = BuildCommentLine(cStyleSyntax, "");
    assert.strictEqual(result.length, 80);
    assert.ok(result.startsWith("// ---"));
  });

  it("produces an 80-char line for C-style with text", () => {
    const result = BuildCommentLine(cStyleSyntax, "Section Title");
    assert.strictEqual(result.length, 80);
    assert.ok(result.includes(" Section Title "));
    assert.ok(result.startsWith("// ---"));
  });

  it("produces an 80-char line for HTML-style with closing comment", () => {
    const result = BuildCommentLine(htmlStyleSyntax, "");
    assert.strictEqual(result.length, 80);
    assert.ok(result.startsWith("<!-- ---"));
    assert.ok(result.endsWith(" -->"));
  });

  it("produces an 80-char line for HTML-style with text", () => {
    const result = BuildCommentLine(htmlStyleSyntax, "Header");
    assert.strictEqual(result.length, 80);
    assert.ok(result.includes(" Header "));
    assert.ok(result.endsWith(" -->"));
  });

  it("produces an 80-char line for hash-style languages", () => {
    const result = BuildCommentLine(hashSyntax, "");
    assert.strictEqual(result.length, 80);
    assert.ok(result.startsWith("## ---"));
  });

  it("normalizes raw single-character markers to doubled fences", () => {
    const result = BuildCommentLine(rawHashSyntax, "Module");
    assert.strictEqual(result.length, 80);
    assert.ok(result.startsWith("## --- Module "));
  });

  it("trims whitespace from input text", () => {
    const result = BuildCommentLine(cStyleSyntax, "  spaced  ");
    assert.strictEqual(result.length, 80);
    assert.ok(result.includes(" spaced "));
    assert.ok(!result.includes("  spaced  "));
  });

  it("handles empty string text same as whitespace-only", () => {
    const empty = BuildCommentLine(cStyleSyntax, "");
    const whitespace = BuildCommentLine(cStyleSyntax, "   ");
    assert.strictEqual(empty, whitespace);
  });

  it("handles very long text gracefully (no negative repeat)", () => {
    const longText = "A".repeat(100);
    const result = BuildCommentLine(cStyleSyntax, longText);
    assert.ok(result.length >= 80);
    assert.ok(result.includes(longText));
  });

  it("fills only with dashes (no spaces in fill area) for C-style", () => {
    const result = BuildCommentLine(cStyleSyntax, "");
    const afterPrefix = result.slice(6); // "// ---" is 6 chars
    assert.match(afterPrefix, /^-+$/);
  });
});

describe("BuildCommentLine with custom config", () => {
  it("respects custom lineWidth", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 120 };
    const result = BuildCommentLine(cStyleSyntax, "", config);
    assert.strictEqual(result.length, 120);
  });

  it("respects custom separatorChar", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "=" };
    const result = BuildCommentLine(cStyleSyntax, "", config);
    assert.ok(result.startsWith("// ==="));
    assert.ok(!result.includes("-"));
    assert.strictEqual(result.length, 80);
  });

  it("respects custom separatorPrefixLength", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorPrefixLength: 5 };
    const result = BuildCommentLine(cStyleSyntax, "Title", config);
    assert.ok(result.startsWith("// ----- Title "));
    assert.strictEqual(result.length, 80);
  });

  it("works with all custom values together", () => {
    const config: FormattingConfig = {
      lineWidth: 100,
      separatorChar: "=",
      separatorPrefixLength: 4,
      separatorBlankLines: 0,
    };
    const result = BuildCommentLine(cStyleSyntax, "Hello", config);
    assert.strictEqual(result.length, 100);
    assert.ok(result.startsWith("// ==== Hello "));
    assert.ok(!result.includes("-"));
  });

  it("uses DEFAULT_CONFIG when no config provided", () => {
    const withDefault = BuildCommentLine(cStyleSyntax, "Test");
    const withExplicit = BuildCommentLine(cStyleSyntax, "Test", DEFAULT_CONFIG);
    assert.strictEqual(withDefault, withExplicit);
  });

  it("handles narrow lineWidth with long text gracefully", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 20 };
    const result = BuildCommentLine(cStyleSyntax, "A very long title that exceeds width", config);
    assert.ok(result.length >= 20);
    assert.ok(result.includes("A very long title that exceeds width"));
  });

  it("respects custom config with HTML-style syntax", () => {
    const config: FormattingConfig = {
      lineWidth: 60,
      separatorChar: "~",
      separatorPrefixLength: 2,
      separatorBlankLines: 0,
    };
    const result = BuildCommentLine(htmlStyleSyntax, "Note", config);
    assert.strictEqual(result.length, 60);
    assert.ok(result.startsWith("<!-- ~~ Note "));
    assert.ok(result.endsWith(" -->"));
  });

  it("respects the configured width after the current indentation column", () => {
    const result = BuildCommentLine(cStyleSyntax, "", DEFAULT_CONFIG, 12);
    assert.strictEqual(result.length, 68);
    assert.strictEqual(result.length + 12, 80);
    assert.ok(result.startsWith("// ---"));
  });

  it("respects the configured width after indentation when text is present", () => {
    const result = BuildCommentLine(cStyleSyntax, "Indented", DEFAULT_CONFIG, 20);
    assert.strictEqual(result.length, 60);
    assert.strictEqual(result.length + 20, 80);
    assert.ok(result.includes(" Indented "));
  });

  it("respects the configured width after indentation for closing-suffix syntaxes", () => {
    const result = BuildCommentLine(htmlStyleSyntax, "Indented", DEFAULT_CONFIG, 10);
    assert.strictEqual(result.length, 70);
    assert.strictEqual(result.length + 10, 80);
    assert.ok(result.endsWith(" -->"));
  });
});
