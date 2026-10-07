import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  ParseFancyCommentBlock,
  BuildCommentBlock,
  BuildCommentBlockWithSeparator,
  CommentSyntax,
  FormattingConfig,
  DEFAULT_CONFIG,
} from "../Source/Core/Formatting";

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
  return BuildCommentBlockWithSeparator(syntax, indent, text, config).split("\n");
}

describe("ParseFancyCommentBlock", () => {
  it("detects a full 4-line C-style block", () => {
    const lines = makeFullBlock(cStyleSyntax, "", "Section");
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Section", lineCount: 4 });
  });

  it("detects a 3-line block without trailing separator", () => {
    const block = BuildCommentBlock(cStyleSyntax, "", "Title");
    const lines = block.split("\n");
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Title", lineCount: 3 });
  });

  it("detects HTML-style block", () => {
    const lines = makeFullBlock(htmlStyleSyntax, "", "Header");
    const result = ParseFancyCommentBlock(lines, htmlStyleSyntax);
    assert.deepStrictEqual(result, { text: "Header", lineCount: 4 });
  });

  it("detects hash-style block", () => {
    const lines = makeFullBlock(hashSyntax, "", "Module");
    const result = ParseFancyCommentBlock(lines, hashSyntax);
    assert.deepStrictEqual(result, { text: "Module", lineCount: 4 });
  });

  it("detects block built from raw single-character markers", () => {
    const lines = makeFullBlock(rawHashSyntax, "", "Module");
    const result = ParseFancyCommentBlock(lines, rawHashSyntax);
    assert.deepStrictEqual(result, { text: "Module", lineCount: 4 });
  });

  it("detects indented block", () => {
    const indent = "    ";
    const lines = makeFullBlock(cStyleSyntax, indent, "Deep");
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Deep", lineCount: 4 });
  });

  it("detects block with empty text", () => {
    const lines = makeFullBlock(cStyleSyntax, "", "");
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "", lineCount: 4 });
  });

  it("returns null for regular code", () => {
    const lines = ["const x = 1;", "const y = 2;", "const z = 3;", ""];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when first line does not match", () => {
    const lines = ["// not a block start", "* content", "*/", "// ---"];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when middle line does not match", () => {
    const lines = ["/*", "no asterisk prefix", "*/", "// ---"];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when end line does not match", () => {
    const lines = ["/*", "* content", "not a close", "// ---"];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when fewer than 3 lines provided", () => {
    const result = ParseFancyCommentBlock(["/*", "* x"], cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns 3 lines when 4th line is not a separator", () => {
    const block = BuildCommentBlock(cStyleSyntax, "", "Text");
    const lines = [...block.split("\n"), "some other code"];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Text", lineCount: 3 });
  });
});

describe("ParseFancyCommentBlock with custom config", () => {
  it("detects block with custom separator config", () => {
    const config: FormattingConfig = {
      lineWidth: 100,
      separatorChar: "=",
      separatorPrefixLength: 4,
      separatorBlankLines: 0,
    };
    const lines = makeFullBlock(cStyleSyntax, "", "Custom", config);
    const result = ParseFancyCommentBlock(lines, cStyleSyntax, config);
    assert.deepStrictEqual(result, { text: "Custom", lineCount: 4 });
  });

  it("includes configured blank lines before the separator in the parsed block", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorBlankLines: 2 };
    const lines = makeFullBlock(cStyleSyntax, "", "Spaced", config);

    assert.deepStrictEqual(ParseFancyCommentBlock(lines, cStyleSyntax, config), {
      text: "Spaced",
      lineCount: 6,
    });
    assert.deepStrictEqual(ParseFancyCommentBlock(lines, cStyleSyntax), {
      text: "Spaced",
      lineCount: 6,
    });
  });

  it("returns 3 lines when separator uses mismatched config", () => {
    const buildConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "=" };
    const parseConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "-" };
    const lines = makeFullBlock(cStyleSyntax, "", "Mismatch", buildConfig);
    const result = ParseFancyCommentBlock(lines, cStyleSyntax, parseConfig);
    // Block itself still matches (3 lines), but separator doesn't match parseConfig
    assert.deepStrictEqual(result, { text: "Mismatch", lineCount: 3 });
  });
});

describe("ParseFancyCommentBlock roundtrip", () => {
  const texts = ["", "Title", "CONSTANTS", "hello-world"];
  const syntaxes = [cStyleSyntax, htmlStyleSyntax, hashSyntax];

  for (const syntax of syntaxes) {
    for (const text of texts) {
      it(`roundtrip: syntax=${syntax.singleLineStart} text="${text}"`, () => {
        const lines = makeFullBlock(syntax, "", text);
        const parsed = ParseFancyCommentBlock(lines, syntax);
        assert.notStrictEqual(parsed, null);
        assert.strictEqual(parsed!.text, text);
        assert.strictEqual(parsed!.lineCount, 4);
      });
    }
  }
});

describe("ParseFancyCommentBlock multi-line release regressions", () => {
  it("round-trips multi-line text and all opening indentation variants", () => {
    for (const indent of ["  ", "\t", " \t  "]) {
      const lines = makeFullBlock(cStyleSyntax, indent, "First\n  Second\n\tThird");
      assert.deepStrictEqual(ParseFancyCommentBlock(lines, cStyleSyntax), {
        text: "First\n  Second\n\tThird",
        lineCount: 6,
      });
    }
  });

  it("rejects a block whose opening delimiter uses a different indentation", () => {
    const lines = ["/*", "  * Title", "  */"];
    assert.strictEqual(ParseFancyCommentBlock(lines, cStyleSyntax), null);
  });
});
