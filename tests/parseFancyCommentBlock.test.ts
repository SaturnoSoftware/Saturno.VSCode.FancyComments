import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { parseFancyCommentBlock, buildCommentBlock, buildCommentLine, CommentSyntax, FormattingConfig, DEFAULT_CONFIG } from "../Source/formatting";

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

function makeFullBlock(syntax: CommentSyntax, indent: string, text: string, config: FormattingConfig = DEFAULT_CONFIG): string[] {
  const block = buildCommentBlock(syntax, indent, text);
  const separator = indent + buildCommentLine(syntax, "", config);
  return [...block.split("\n"), separator];
}

describe("parseFancyCommentBlock", () => {
  it("detects a full 4-line C-style block", () => {
    const lines = makeFullBlock(cStyleSyntax, "", "Section");
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Section", lineCount: 4 });
  });

  it("detects a 3-line block without trailing separator", () => {
    const block = buildCommentBlock(cStyleSyntax, "", "Title");
    const lines = block.split("\n");
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Title", lineCount: 3 });
  });

  it("detects HTML-style block", () => {
    const lines = makeFullBlock(htmlStyleSyntax, "", "Header");
    const result = parseFancyCommentBlock(lines, htmlStyleSyntax);
    assert.deepStrictEqual(result, { text: "Header", lineCount: 4 });
  });

  it("detects hash-style block", () => {
    const lines = makeFullBlock(hashSyntax, "", "Module");
    const result = parseFancyCommentBlock(lines, hashSyntax);
    assert.deepStrictEqual(result, { text: "Module", lineCount: 4 });
  });

  it("detects block built from raw single-character markers", () => {
    const lines = makeFullBlock(rawHashSyntax, "", "Module");
    const result = parseFancyCommentBlock(lines, rawHashSyntax);
    assert.deepStrictEqual(result, { text: "Module", lineCount: 4 });
  });

  it("detects indented block", () => {
    const indent = "    ";
    const lines = makeFullBlock(cStyleSyntax, indent, "Deep");
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Deep", lineCount: 4 });
  });

  it("detects block with empty text", () => {
    const lines = makeFullBlock(cStyleSyntax, "", "");
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "", lineCount: 4 });
  });

  it("returns null for regular code", () => {
    const lines = ["const x = 1;", "const y = 2;", "const z = 3;", ""];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when first line does not match", () => {
    const lines = ["// not a block start", "* content", "*/", "// ---"];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when middle line does not match", () => {
    const lines = ["/*", "no asterisk prefix", "*/", "// ---"];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when end line does not match", () => {
    const lines = ["/*", "* content", "not a close", "// ---"];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when fewer than 3 lines provided", () => {
    const result = parseFancyCommentBlock(["/*", "* x"], cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns 3 lines when 4th line is not a separator", () => {
    const block = buildCommentBlock(cStyleSyntax, "", "Text");
    const lines = [...block.split("\n"), "some other code"];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Text", lineCount: 3 });
  });
});

describe("parseFancyCommentBlock with custom config", () => {
  it("detects block with custom separator config", () => {
    const config: FormattingConfig = { lineWidth: 100, separatorChar: "=", separatorPrefixLength: 4 };
    const lines = makeFullBlock(cStyleSyntax, "", "Custom", config);
    const result = parseFancyCommentBlock(lines, cStyleSyntax, config);
    assert.deepStrictEqual(result, { text: "Custom", lineCount: 4 });
  });

  it("returns 3 lines when separator uses mismatched config", () => {
    const buildConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "=" };
    const parseConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "-" };
    const lines = makeFullBlock(cStyleSyntax, "", "Mismatch", buildConfig);
    const result = parseFancyCommentBlock(lines, cStyleSyntax, parseConfig);
    // Block itself still matches (3 lines), but separator doesn't match parseConfig
    assert.deepStrictEqual(result, { text: "Mismatch", lineCount: 3 });
  });
});

describe("parseFancyCommentBlock roundtrip", () => {
  const texts = ["", "Title", "CONSTANTS", "hello-world"];
  const syntaxes = [cStyleSyntax, htmlStyleSyntax, hashSyntax];

  for (const syntax of syntaxes) {
    for (const text of texts) {
      it(`roundtrip: syntax=${syntax.singleLineStart} text="${text}"`, () => {
        const lines = makeFullBlock(syntax, "", text);
        const parsed = parseFancyCommentBlock(lines, syntax);
        assert.notStrictEqual(parsed, null);
        assert.strictEqual(parsed!.text, text);
        assert.strictEqual(parsed!.lineCount, 4);
      });
    }
  }
});

describe("parseFancyCommentBlock multi-line release regressions", () => {
  it("round-trips multi-line text and all opening indentation variants", () => {
    for (const indent of ["  ", "\t", " \t  "]) {
      const lines = makeFullBlock(cStyleSyntax, indent, "First\n  Second\n\tThird");
      assert.deepStrictEqual(parseFancyCommentBlock(lines, cStyleSyntax), {
        text: "First\n  Second\n\tThird",
        lineCount: 6,
      });
    }
  });

  it("rejects a block whose opening delimiter uses a different indentation", () => {
    const lines = ["/*", "  * Title", "  */"];
    assert.strictEqual(parseFancyCommentBlock(lines, cStyleSyntax), null);
  });
});