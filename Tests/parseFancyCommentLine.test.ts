import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ParseFancyCommentLine, BuildCommentLine, CommentSyntax, FormattingConfig, DEFAULT_CONFIG } from "../Source/Core/Formatting";

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

describe("ParseFancyCommentLine", () => {
  it("detects C-style fancy comment with no text", () => {
    const line = BuildCommentLine(cStyleSyntax, "");
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "" });
  });

  it("detects C-style fancy comment with text", () => {
    const line = BuildCommentLine(cStyleSyntax, "Section Title");
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Section Title" });
  });

  it("detects HTML-style fancy comment with no text", () => {
    const line = BuildCommentLine(htmlStyleSyntax, "");
    const result = ParseFancyCommentLine(line, htmlStyleSyntax);
    assert.deepStrictEqual(result, { text: "" });
  });

  it("detects HTML-style fancy comment with text", () => {
    const line = BuildCommentLine(htmlStyleSyntax, "Header");
    const result = ParseFancyCommentLine(line, htmlStyleSyntax);
    assert.deepStrictEqual(result, { text: "Header" });
  });

  it("detects hash-style fancy comment", () => {
    const line = BuildCommentLine(hashSyntax, "Module");
    const result = ParseFancyCommentLine(line, hashSyntax);
    assert.deepStrictEqual(result, { text: "Module" });
  });

  it("detects fancy comments built from raw single-character markers", () => {
    const line = BuildCommentLine(rawHashSyntax, "Module");
    const result = ParseFancyCommentLine(line, rawHashSyntax);
    assert.deepStrictEqual(result, { text: "Module" });
  });

  it("handles text containing the separator character", () => {
    const line = BuildCommentLine(cStyleSyntax, "a-b-c");
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "a-b-c" });
  });

  it("handles text with multiple dashes", () => {
    const line = BuildCommentLine(cStyleSyntax, "foo--bar");
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "foo--bar" });
  });

  it("returns null for a regular comment", () => {
    const result = ParseFancyCommentLine("// just a normal comment", cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for a comment with wrong prefix length", () => {
    const result = ParseFancyCommentLine("// -- not enough dashes", cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for plain text", () => {
    const result = ParseFancyCommentLine("hello world", cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for empty string", () => {
    const result = ParseFancyCommentLine("", cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles leading whitespace (indented line)", () => {
    const line = "    " + BuildCommentLine(cStyleSyntax, "Indented");
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Indented" });
  });

  it("returns null for HTML comment missing closing suffix", () => {
    const result = ParseFancyCommentLine("<!-- --- Title -----", htmlStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles zero-fill case (text exceeds line width)", () => {
    const longText = "A".repeat(100);
    const line = BuildCommentLine(cStyleSyntax, longText);
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: longText });
  });
});

describe("ParseFancyCommentLine with custom config", () => {
  it("detects with custom separatorChar", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "=" };
    const line = BuildCommentLine(cStyleSyntax, "Title", config);
    const result = ParseFancyCommentLine(line, cStyleSyntax, config);
    assert.deepStrictEqual(result, { text: "Title" });
  });

  it("detects with custom separatorPrefixLength", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorPrefixLength: 5 };
    const line = BuildCommentLine(cStyleSyntax, "Hello", config);
    const result = ParseFancyCommentLine(line, cStyleSyntax, config);
    assert.deepStrictEqual(result, { text: "Hello" });
  });

  it("detects with custom lineWidth", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 120 };
    const line = BuildCommentLine(cStyleSyntax, "Wide", config);
    const result = ParseFancyCommentLine(line, cStyleSyntax, config);
    assert.deepStrictEqual(result, { text: "Wide" });
  });

  it("does not detect when config does not match", () => {
    const buildConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "=" };
    const parseConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "-" };
    const line = BuildCommentLine(cStyleSyntax, "Mismatch", buildConfig);
    const result = ParseFancyCommentLine(line, cStyleSyntax, parseConfig);
    assert.strictEqual(result, null);
  });
});

describe("ParseFancyCommentLine roundtrip", () => {
  const texts = ["", "Title", "a-b-c", "Hello World", "CONSTANTS", "foo--bar--baz"];
  const syntaxes = [cStyleSyntax, htmlStyleSyntax, hashSyntax];
  const configs: FormattingConfig[] = [
    DEFAULT_CONFIG,
    { lineWidth: 100, separatorChar: "=", separatorPrefixLength: 4, separatorBlankLines: 0 },
    { lineWidth: 60, separatorChar: "~", separatorPrefixLength: 2, separatorBlankLines: 0 },
  ];

  for (const syntax of syntaxes) {
    for (const config of configs) {
      for (const text of texts) {
        it(`roundtrip: syntax=${syntax.singleLineStart} config=${config.separatorChar}x${config.separatorPrefixLength}@${config.lineWidth} text="${text}"`, () => {
          const line = BuildCommentLine(syntax, text, config);
          const parsed = ParseFancyCommentLine(line, syntax, config);
          assert.notStrictEqual(parsed, null);
          assert.strictEqual(parsed!.text, text);
        });
      }
    }
  }
});
