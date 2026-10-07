import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  FindFancyCommentBlock,
  BuildCommentBlock,
  BuildCommentBlockWithSeparator,
  BuildCommentLine,
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

function makeDocument(syntax: CommentSyntax, indent: string, text: string, config: FormattingConfig = DEFAULT_CONFIG): string[] {
  return BuildCommentBlockWithSeparator(syntax, indent, text, config).split("\n");
}

describe("FindFancyCommentBlock - cursor on different lines", () => {
  it("detects block when cursor is on line 0 (multiLineStart)", () => {
    const lines = makeDocument(cStyleSyntax, "", "Title");
    const result = FindFancyCommentBlock(lines, 0, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Title", startLine: 0, lineCount: 4 });
  });

  it("detects block when cursor is on line 1 (middle)", () => {
    const lines = makeDocument(cStyleSyntax, "", "Title");
    const result = FindFancyCommentBlock(lines, 1, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Title", startLine: 0, lineCount: 4 });
  });

  it("detects block when cursor is on line 2 (multiLineEnd)", () => {
    const lines = makeDocument(cStyleSyntax, "", "Title");
    const result = FindFancyCommentBlock(lines, 2, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Title", startLine: 0, lineCount: 4 });
  });

  it("detects block when cursor is on line 3 (trailing separator)", () => {
    const lines = makeDocument(cStyleSyntax, "", "Title");
    const result = FindFancyCommentBlock(lines, 3, cStyleSyntax);
    assert.deepStrictEqual(result, { text: "Title", startLine: 0, lineCount: 4 });
  });
});

describe("FindFancyCommentBlock - block not at start of document", () => {
  it("detects block with code lines before it", () => {
    const before = ["const x = 1;", "const y = 2;", ""];
    const block = makeDocument(cStyleSyntax, "", "Section");
    const lines = [...before, ...block];

    // Cursor on line 3 (multiLineStart)
    const r0 = FindFancyCommentBlock(lines, 3, cStyleSyntax);
    assert.deepStrictEqual(r0, { text: "Section", startLine: 3, lineCount: 4 });

    // Cursor on line 4 (middle)
    const r1 = FindFancyCommentBlock(lines, 4, cStyleSyntax);
    assert.deepStrictEqual(r1, { text: "Section", startLine: 3, lineCount: 4 });

    // Cursor on line 5 (end)
    const r2 = FindFancyCommentBlock(lines, 5, cStyleSyntax);
    assert.deepStrictEqual(r2, { text: "Section", startLine: 3, lineCount: 4 });

    // Cursor on line 6 (separator)
    const r3 = FindFancyCommentBlock(lines, 6, cStyleSyntax);
    assert.deepStrictEqual(r3, { text: "Section", startLine: 3, lineCount: 4 });
  });

  it("returns null for cursor on unrelated code", () => {
    const before = ["const x = 1;", "const y = 2;", ""];
    const block = makeDocument(cStyleSyntax, "", "Section");
    const lines = [...before, ...block];

    const result = FindFancyCommentBlock(lines, 0, cStyleSyntax);
    assert.strictEqual(result, null);
  });
});

describe("FindFancyCommentBlock - returns null correctly", () => {
  it("returns null when no block exists", () => {
    const lines = ["const a = 1;", "const b = 2;", "// just a comment"];
    const result = FindFancyCommentBlock(lines, 2, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when block start is more than 3 lines back", () => {
    const lines = ["/*", "* text", "*/", BuildCommentLine(cStyleSyntax, ""), "", "far away"];
    const result = FindFancyCommentBlock(lines, 5, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for cursor past the block", () => {
    const block = makeDocument(cStyleSyntax, "", "Title");
    const lines = [...block, "const after = true;"];
    const result = FindFancyCommentBlock(lines, 4, cStyleSyntax);
    assert.strictEqual(result, null);
  });
});

describe("FindFancyCommentBlock - indented blocks", () => {
  it("detects indented block from any cursor position", () => {
    const indent = "    ";
    const lines = makeDocument(cStyleSyntax, indent, "Deep");

    for (let cursor = 0; cursor < lines.length; cursor++) {
      const result = FindFancyCommentBlock(lines, cursor, cStyleSyntax);
      assert.notStrictEqual(result, null, `Failed at cursor=${cursor}`);
      assert.strictEqual(result!.text, "Deep");
      assert.strictEqual(result!.startLine, 0);
    }
  });
});

describe("FindFancyCommentBlock - HTML-style blocks", () => {
  it("detects HTML block from any cursor position", () => {
    const lines = makeDocument(htmlStyleSyntax, "", "Header");

    for (let cursor = 0; cursor < lines.length; cursor++) {
      const result = FindFancyCommentBlock(lines, cursor, htmlStyleSyntax);
      assert.notStrictEqual(result, null, `Failed at cursor=${cursor}`);
      assert.strictEqual(result!.text, "Header");
      assert.strictEqual(result!.startLine, 0);
    }
  });
});

describe("FindFancyCommentBlock - hash-style blocks", () => {
  it("detects hash block from any cursor position", () => {
    const lines = makeDocument(hashSyntax, "", "Module");

    for (let cursor = 0; cursor < lines.length; cursor++) {
      const result = FindFancyCommentBlock(lines, cursor, hashSyntax);
      assert.notStrictEqual(result, null, `Failed at cursor=${cursor}`);
      assert.strictEqual(result!.text, "Module");
      assert.strictEqual(result!.startLine, 0);
    }
  });
});

describe("FindFancyCommentBlock - custom config", () => {
  it("detects block with separatorChar '*'", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "*" };
    const lines = makeDocument(cStyleSyntax, "", "Stars", config);

    const result = FindFancyCommentBlock(lines, 2, cStyleSyntax, config);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.text, "Stars");
  });

  it("detects block with separatorChar '=' and custom width", () => {
    const config: FormattingConfig = {
      lineWidth: 100,
      separatorChar: "=",
      separatorPrefixLength: 4,
      separatorBlankLines: 0,
    };
    const lines = makeDocument(cStyleSyntax, "", "Equals", config);

    const result = FindFancyCommentBlock(lines, 3, cStyleSyntax, config);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.text, "Equals");
  });

  it("recognizes the separator and blank gap as part of a block when the cursor is on either", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorBlankLines: 2 };
    const lines = makeDocument(cStyleSyntax, "", "Spaced", config);

    for (const cursor of [3, 4, 5]) {
      assert.deepStrictEqual(FindFancyCommentBlock(lines, cursor, cStyleSyntax, config), {
        text: "Spaced",
        startLine: 0,
        lineCount: 6,
      });
    }
  });

  it("does not detect when config mismatches separator line", () => {
    const buildConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "*" };
    const parseConfig: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "-" };
    const lines = makeDocument(cStyleSyntax, "", "Mismatch", buildConfig);

    // Block structure (lines 0-2) still matches, but separator (line 3) doesn't
    // So it should find the block with lineCount: 3
    const result = FindFancyCommentBlock(lines, 1, cStyleSyntax, parseConfig);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.text, "Mismatch");
    assert.strictEqual(result!.lineCount, 3);
  });
});

describe("FindFancyCommentBlock - 3-line blocks (no trailing separator)", () => {
  it("detects 3-line block from any position", () => {
    const block = BuildCommentBlock(cStyleSyntax, "", "NoSep");
    const lines = [...block.split("\n"), "unrelated code"];

    for (let cursor = 0; cursor <= 2; cursor++) {
      const result = FindFancyCommentBlock(lines, cursor, cStyleSyntax);
      assert.notStrictEqual(result, null, `Failed at cursor=${cursor}`);
      assert.strictEqual(result!.text, "NoSep");
      assert.strictEqual(result!.lineCount, 3);
    }
  });
});
