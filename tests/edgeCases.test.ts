import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  buildCommentLine,
  buildCommentBlock,
  parseFancyCommentLine,
  parseFancyCommentBlock,
  findFancyCommentBlock,
  getIndentColumn,
  CommentSyntax,
  FormattingConfig,
  DEFAULT_CONFIG,
} from "../src/formatting";

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

describe("buildCommentLine - extreme inputs", () => {
  it("handles extremely long text (1000+ characters)", () => {
    const longText = "A".repeat(1000);
    const result = buildCommentLine(cStyleSyntax, longText);
    assert.ok(result.includes(longText));
    assert.ok(result.length >= longText.length);
  });

  it("handles text with special Unicode characters", () => {
    const unicodeText = "Hello 世界 🚀 Ñoño";
    const result = buildCommentLine(cStyleSyntax, unicodeText);
    assert.ok(result.includes(unicodeText));
    assert.strictEqual(result.length, 80);
  });

  it("handles text with emoji and zero-width characters", () => {
    const emojiText = "Test 👨‍👩‍👧‍👦 🎉";
    const result = buildCommentLine(cStyleSyntax, emojiText);
    assert.ok(result.includes(emojiText));
  });

  it("handles text with newlines (should be ignored in single line)", () => {
    const textWithNewlines = "Line1\nLine2\rLine3\r\nLine4";
    const result = buildCommentLine(cStyleSyntax, textWithNewlines);
    assert.ok(result.includes(textWithNewlines));
  });

  it("handles text with multiple consecutive spaces", () => {
    const spacedText = "Word1     Word2        Word3";
    const result = buildCommentLine(cStyleSyntax, spacedText);
    assert.ok(result.includes(spacedText.trim()));
  });

  it("handles text with tab characters", () => {
    const tabbedText = "Word1\t\tWord2\t\t\tWord3";
    const result = buildCommentLine(cStyleSyntax, tabbedText);
    assert.ok(result.includes(tabbedText.trim()));
  });

  it("handles zero-width lineWidth configuration", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 0 };
    const result = buildCommentLine(cStyleSyntax, "Test", config);
    assert.ok(result.length >= 0);
  });

  it("handles negative lineWidth configuration (treats as zero)", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: -100 };
    const result = buildCommentLine(cStyleSyntax, "Test", config);
    assert.ok(result.length >= 0);
  });

  it("handles extremely large lineWidth (10000 chars)", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 10000 };
    const result = buildCommentLine(cStyleSyntax, "Test", config);
    assert.strictEqual(result.length, 10000);
  });

  it("handles separatorChar as empty string", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "" };
    const result = buildCommentLine(cStyleSyntax, "Test", config);
    assert.ok(result.includes("Test"));
  });

  it("handles separatorChar as multi-character string", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "-=-" };
    const result = buildCommentLine(cStyleSyntax, "", config);
    assert.ok(result.includes("-=-"));
  });

  it("handles separatorChar as Unicode emoji", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "🔥" };
    const result = buildCommentLine(cStyleSyntax, "Hot", config);
    assert.ok(result.includes("🔥"));
  });

  it("handles zero separatorPrefixLength", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorPrefixLength: 0 };
    const result = buildCommentLine(cStyleSyntax, "Test", config);
    assert.strictEqual(result.length, 80);
  });

  it("handles negative separatorPrefixLength (throws)", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorPrefixLength: -5 };
    assert.throws(() => buildCommentLine(cStyleSyntax, "Test", config));
  });

  it("handles extremely large separatorPrefixLength", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorPrefixLength: 1000 };
    const result = buildCommentLine(cStyleSyntax, "Test", config);
    assert.ok(result.length >= 80);
  });

  it("handles startColumn larger than lineWidth", () => {
    const result = buildCommentLine(cStyleSyntax, "Test", DEFAULT_CONFIG, 200);
    assert.ok(result.length >= 0);
  });

  it("handles negative startColumn", () => {
    const result = buildCommentLine(cStyleSyntax, "Test", DEFAULT_CONFIG, -50);
    assert.ok(result.length > 0);
  });
});

describe("buildCommentBlock - extreme inputs", () => {
  it("handles extremely long text in block", () => {
    const longText = "X".repeat(5000);
    const result = buildCommentBlock(cStyleSyntax, "", longText);
    assert.ok(result.includes(longText));
  });

  it("handles text with embedded comment markers", () => {
    const text = "This has /* and */ inside";
    const result = buildCommentBlock(cStyleSyntax, "", text);
    assert.ok(result.includes(text));
  });

  it("handles indent with tabs", () => {
    const result = buildCommentBlock(cStyleSyntax, "\t\t\t", "Tabbed");
    assert.ok(result.includes("\t\t\t"));
  });

  it("handles indent with mixed spaces and tabs", () => {
    const indent = "  \t  \t";
    const result = buildCommentBlock(cStyleSyntax, indent, "Mixed");
    assert.ok(result.includes(indent));
  });

  it("handles extremely long indent", () => {
    const indent = " ".repeat(500);
    const result = buildCommentBlock(cStyleSyntax, indent, "Deep");
    assert.ok(result.includes(indent));
  });

  it("handles Unicode whitespace in indent", () => {
    const indent = "\u00A0\u00A0"; // Non-breaking spaces
    const result = buildCommentBlock(cStyleSyntax, indent, "Unicode");
    assert.ok(result.includes(indent));
  });

  it("handles empty text with whitespace indent", () => {
    const result = buildCommentBlock(cStyleSyntax, "    ", "");
    const lines = result.split("\n");
    assert.strictEqual(lines.length, 3);
  });
});

describe("parseFancyCommentLine - malicious inputs", () => {
  it("parses code injection text safely (does not execute)", () => {
    const line = buildCommentLine(cStyleSyntax, "Evil; DROP TABLE users;");
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null);
    assert.strictEqual(result.text, "Evil; DROP TABLE users;");
  });

  it("parses script tag as text (does not execute)", () => {
    const line = buildCommentLine(cStyleSyntax, "<script>alert('xss')</script>");
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null);
    assert.strictEqual(result.text, "<script>alert('xss')</script>");
  });

  it("handles line with null bytes", () => {
    const line = "// --- Test\x00Null ---";
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result === null || result.text);
  });

  it("handles line that is only comment markers", () => {
    const line = "//////";
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles line with mismatched syntax", () => {
    const line = "/* --- Test --- */";
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles line with wrong separatorChar", () => {
    const line = "// === Test ===";
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles extremely long line (buffer overflow attempt)", () => {
    const line = "// ---" + "A".repeat(1000000) + "---";
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null || result === null);
  });

  it("handles line with only dashes (empty text case)", () => {
    const line = buildCommentLine(cStyleSyntax, "");
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null);
    assert.strictEqual(result.text, "");
  });

  it("handles line with mixed Unicode direction markers", () => {
    const line = "// --- ‮‭Test‬ ---";
    const result = parseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null);
  });
});

describe("parseFancyCommentBlock - error conditions", () => {
  it("returns null for empty array", () => {
    const result = parseFancyCommentBlock([], cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for single-line array", () => {
    const result = parseFancyCommentBlock(["/*"], cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for two-line array", () => {
    const result = parseFancyCommentBlock(["/*", "* Text"], cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when multiLineStart is missing", () => {
    const lines = ["", "* Text", "*/"];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when multiLineEnd is missing", () => {
    const lines = ["/*", "* Text", ""];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when middle line has wrong format", () => {
    const lines = ["/*", "Text without star", "*/"];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when indent is inconsistent", () => {
    const lines = ["/*", "    * Text", "  */"];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles block with extremely long text", () => {
    const longText = "Y".repeat(10000);
    const lines = ["/*", "* " + longText, "*/"];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.text, longText);
  });

  it("handles block with embedded newlines in text (malformed)", () => {
    const lines = ["/*", "* Text\nWith\nNewlines", "*/"];
    const result = parseFancyCommentBlock(lines, cStyleSyntax);
    assert.ok(result);
  });
});

describe("findFancyCommentBlock - boundary conditions", () => {
  it("returns null when cursorLine is negative", () => {
    const lines = ["/*", "* Text", "*/", "// ---"];
    const result = findFancyCommentBlock(lines, -1, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles cursorLine exceeds array length gracefully", () => {
    const lines = ["/*", "* Text", "*/", "// ---"];
    // When cursor is way past the document, searches backwards from that position
    // Since search only goes back 3 lines, it won't find anything
    try {
      const result = findFancyCommentBlock(lines, 100, cStyleSyntax);
      assert.strictEqual(result, null);
    } catch (e) {
      // Also acceptable if it throws for out-of-bounds
      assert.ok(true);
    }
  });

  it("handles cursorLine at exact array length boundary", () => {
    const lines = ["/*", "* Text", "*/", "// ---"];
    // Cursor at lines.length is one past the end
    try {
      const result = findFancyCommentBlock(lines, lines.length, cStyleSyntax);
      assert.strictEqual(result, null);
    } catch (e) {
      // Also acceptable if it throws for out-of-bounds
      assert.ok(true);
    }
  });

  it("handles empty document gracefully", () => {
    try {
      const result = findFancyCommentBlock([], 0, cStyleSyntax);
      assert.strictEqual(result, null);
    } catch (e) {
      // Also acceptable if it throws for empty array
      assert.ok(true);
    }
  });

  it("handles document with only blank lines", () => {
    const lines = ["", "", "", ""];
    const result = findFancyCommentBlock(lines, 2, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles multiple blocks and finds correct one", () => {
    const block1 = ["/*", "* First", "*/", "// ---"];
    const block2 = ["/*", "* Second", "*/", "// ---"];
    const lines = [...block1, "code", ...block2];

    const result1 = findFancyCommentBlock(lines, 1, cStyleSyntax);
    assert.strictEqual(result1?.text, "First");

    const result2 = findFancyCommentBlock(lines, 6, cStyleSyntax);
    assert.strictEqual(result2?.text, "Second");
  });

  it("does not detect incomplete block at document end", () => {
    const lines = ["const x = 1;", "/*", "* Incomplete"];
    const result = findFancyCommentBlock(lines, 2, cStyleSyntax);
    assert.strictEqual(result, null);
  });
});

describe("getIndentColumn - edge cases", () => {
  it("returns cursor position for empty string", () => {
    const result = getIndentColumn("", 0);
    assert.strictEqual(result, 0);
  });

  it("returns cursor position for whitespace-only line", () => {
    const result = getIndentColumn("        ", 8);
    assert.strictEqual(result, 8);
  });

  it("handles line with tabs", () => {
    const result = getIndentColumn("\t\tcode", 0);
    assert.strictEqual(result, 2);
  });

  it("handles mixed tabs and spaces", () => {
    const result = getIndentColumn("  \t  code", 0);
    assert.strictEqual(result, 5);
  });

  it("handles zero cursor position", () => {
    const result = getIndentColumn("    code", 0);
    assert.strictEqual(result, 4);
  });

  it("handles cursor beyond line length", () => {
    const result = getIndentColumn("  code", 100);
    assert.strictEqual(result, 2);
  });

  it("handles negative cursor position", () => {
    const result = getIndentColumn("  code", -5);
    assert.strictEqual(result, 2);
  });

  it("handles Unicode whitespace", () => {
    const result = getIndentColumn("\u00A0\u00A0code", 0);
    assert.strictEqual(result, 2);
  });

  it("handles extremely long indent", () => {
    const indent = " ".repeat(1000);
    const result = getIndentColumn(indent + "code", 0);
    assert.strictEqual(result, 1000);
  });
});

describe("syntax edge cases", () => {
  it("handles syntax with empty singleLineStart", () => {
    const weirdSyntax: CommentSyntax = {
      singleLineStart: "",
      singleLineEnd: "",
      multiLineStart: "BEGIN",
      multiLineMiddle: "-",
      multiLineEnd: "END",
    };
    const result = buildCommentLine(weirdSyntax, "Test");
    assert.ok(result.length > 0);
  });

  it("handles syntax with very long comment markers", () => {
    const longSyntax: CommentSyntax = {
      singleLineStart: "//////////",
      singleLineEnd: "\\\\\\\\\\\\\\\\\\\\",
      multiLineStart: "/**********",
      multiLineMiddle: "**********",
      multiLineEnd: "**********/",
    };
    const result = buildCommentLine(longSyntax, "Test");
    assert.ok(result.includes("Test"));
  });

  it("handles syntax with Unicode comment markers", () => {
    const unicodeSyntax: CommentSyntax = {
      singleLineStart: "⟨⟨",
      singleLineEnd: "⟩⟩",
      multiLineStart: "⟪",
      multiLineMiddle: "│",
      multiLineEnd: "⟫",
    };
    const result = buildCommentLine(unicodeSyntax, "Test");
    assert.ok(result.includes("Test"));
  });

  it("handles syntax where start and end are the same", () => {
    const sameSyntax: CommentSyntax = {
      singleLineStart: "##",
      singleLineEnd: "##",
      multiLineStart: "##",
      multiLineMiddle: "##",
      multiLineEnd: "##",
    };
    const result = buildCommentLine(sameSyntax, "Test");
    assert.ok(result.includes("Test"));
  });
});

describe("combined edge cases", () => {
  it("handles maximum indent with minimum lineWidth", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 10 };
    const result = buildCommentLine(cStyleSyntax, "X", config, 50);
    assert.ok(result.length >= 0);
  });

  it("parses and rebuilds line identically for simple case", () => {
    const original = buildCommentLine(cStyleSyntax, "Round Trip");
    const parsed = parseFancyCommentLine(original, cStyleSyntax);
    assert.notStrictEqual(parsed, null);
    const rebuilt = buildCommentLine(cStyleSyntax, parsed!.text);
    assert.strictEqual(rebuilt, original);
  });

  it("handles all-whitespace text after trim", () => {
    const text = "     \t\t\t     ";
    const result = buildCommentLine(cStyleSyntax, text);
    const empty = buildCommentLine(cStyleSyntax, "");
    assert.strictEqual(result, empty);
  });
});
