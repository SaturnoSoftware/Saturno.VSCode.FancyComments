import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { parseFancyCommentLine, buildCommentLine, CommentSyntax, FormattingConfig, DEFAULT_CONFIG } from "../Source/formatting";

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

describe("parseFancyCommentLine", () => {
  it("detects C-style fancy comment with no text", () => {
    const line = buildCommentLine(cStyleSyntax, "");
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "" });
  });

  it("detects C-style fancy comment with text", () => {
    const line = buildCommentLine(cStyleSyntax, "Section Title");
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Section Title" });
  });

  it("detects HTML-style fancy comment with no text", () => {
    const line = buildCommentLine(htmlStyleSyntax, "");
    const result = parseFancyCommentLine(line, htmlStyleSyntax);
    assert.deepStrictEqual(result, { text: "" });
  });

  it("detects HTML-style fancy comment with text", () => {
    const line = buildCommentLine(htmlStyleSyntax, "Header");
    const result = parseFancyCommentLine(line, htmlStyleSyntax);
    assert.deepStrictEqual(result, { text: "Header" });
  });

  it("detects hash-style fancy comment", () => {
    const line = buildCommentLine(hashSyntax, "Module");
    const result = parseFancyCommentLine(line, hashSyntax);
    assert.deepStrictEqual(result, { text: "Module" });
  });

  it("detects fancy comments built from raw single-character markers", () => {
    const line = buildCommentLine(rawHashSyntax, "Module");
    const result = parseFancyCommentLine(line, rawHashSyntax);
    assert.deepStrictEqual(result, { text: "Module" });
  });

  it("handles text containing the separator character", () => {
    const line = buildCommentLine(cStyleSyntax, "a-b-c");
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "a-b-c" });
  });

  it("handles text with multiple dashes", () => {
    const line = buildCommentLine(cStyleSyntax, "foo--bar");
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "foo--bar" });
  });

  it("returns null for a regular comment", () => {
    const result = parseFancyCommentLine("// just a normal comment", cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for a comment with wrong prefix length", () => {
    const result = parseFancyCommentLine("// -- not enough dashes", cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for plain text", () => {
    const result = parseFancyCommentLine("hello world", cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for empty string", () => {
    const result = parseFancyCommentLine("", cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles leading whitespace (indented line)", () => {
    const line = "    " + buildCommentLine(cStyleSyntax, "Indented");
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Indented" });
  });

  it("returns null for HTML comment missing closing suffix", () => {
    const result = parseFancyCommentLine("<!-- --- Title -----", htmlStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles zero-fill case (text exceeds line width)", () => {
    const longText = "A".repeat(100);
    const line = buildCommentLine(cStyleSyntax, longText);
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.deepStrictEqual(result, { text: longText });
  });
});

describe("parseFancyCommentLine with custom config", () => {
  it("detects with custom separatorChar", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "=" };
    const line = buildCommentLine(cStyleSyntax, "Title", config);
    const result = parseFancyCommentLine(line, cStyleSyntax, config);
    assert.deepStrictEqual(result, { text: "Title" });
  });

  it("detects with custom separatorPrefixLength", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorPrefixLength: 5 };
    const line = buildCommentLine(cStyleSyntax, "Hello", config);
    const result = parseFancyCommentLine(line, cStyleSyntax, config);
    assert.deepStrictEqual(result, { text: "Hello" });
  });

  it("detects with custom lineWidth", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 120 };
    const line = buildCommentLine(cStyleSyntax, "Wide", config);
    const result = parseFancyCommentLine(line, cStyleSyntax, config);
    assert.deepStrictEqual(result, { text: "Wide" });
  });

  it("does not detect when config does not match", () => {
    const buildConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "=" };
    const parseConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "-" };
    const line = buildCommentLine(cStyleSyntax, "Mismatch", buildConfig);
    const result = parseFancyCommentLine(line, cStyleSyntax, parseConfig);
    assert.strictEqual(result, null);
  });
});

describe("parseFancyCommentLine roundtrip", () => {
  const texts = ["", "Title", "a-b-c", "Hello World", "CONSTANTS", "foo--bar--baz"];
  const syntaxes = [cStyleSyntax, htmlStyleSyntax, hashSyntax];
  const configs: FormattingConfig[] = [
    DEFAULT_CONFIG,
    { lineWidth: 100, separatorChar: "=", separatorPrefixLength: 4 },
    { lineWidth: 60, separatorChar: "~", separatorPrefixLength: 2 },
  ];

  for (const syntax of syntaxes) {
    for (const config of configs) {
      for (const text of texts) {
        it(`roundtrip: syntax=${syntax.singleLineStart} config=${config.separatorChar}x${config.separatorPrefixLength}@${config.lineWidth} text="${text}"`, () => {
          const line = buildCommentLine(syntax, text, config);
          const parsed = parseFancyCommentLine(line, syntax, config);
          assert.notStrictEqual(parsed, null);
          assert.strictEqual(parsed!.text, text);
        });
      }
    }
  }
});
