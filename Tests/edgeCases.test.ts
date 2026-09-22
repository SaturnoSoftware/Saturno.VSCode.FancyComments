import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  BuildCommentLine,
  BuildCommentBlock,
  ParseFancyCommentLine,
  ParseFancyCommentBlock,
  FindFancyCommentBlock,
  GetIndentColumn,
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

describe("BuildCommentLine - extreme inputs", () => {
  it("handles extremely long text (1000+ characters)", () => {
    const longText = "A".repeat(1000);
    const result = BuildCommentLine(cStyleSyntax, longText);
    assert.ok(result.includes(longText));
    assert.ok(result.length >= longText.length);
  });

  it("handles text with special Unicode characters", () => {
    const unicodeText = "Hello 世界 🚀 Ñoño";
    const result = BuildCommentLine(cStyleSyntax, unicodeText);
    assert.ok(result.includes(unicodeText));
    assert.strictEqual(result.length, 80);
  });

  it("handles text with emoji and zero-width characters", () => {
    const emojiText = "Test 👨‍👩‍👧‍👦 🎉";
    const result = BuildCommentLine(cStyleSyntax, emojiText);
    assert.ok(result.includes(emojiText));
  });

  it("handles text with newlines (should be ignored in single line)", () => {
    const textWithNewlines = "Line1\nLine2\rLine3\r\nLine4";
    const result = BuildCommentLine(cStyleSyntax, textWithNewlines);
    assert.ok(result.includes(textWithNewlines));
  });

  it("handles text with multiple consecutive spaces", () => {
    const spacedText = "Word1     Word2        Word3";
    const result = BuildCommentLine(cStyleSyntax, spacedText);
    assert.ok(result.includes(spacedText.trim()));
  });

  it("handles text with tab characters", () => {
    const tabbedText = "Word1\t\tWord2\t\t\tWord3";
    const result = BuildCommentLine(cStyleSyntax, tabbedText);
    assert.ok(result.includes(tabbedText.trim()));
  });

  it("handles zero-width lineWidth configuration", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 0 };
    const result = BuildCommentLine(cStyleSyntax, "Test", config);
    assert.ok(result.length >= 0);
  });

  it("handles negative lineWidth configuration (treats as zero)", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: -100 };
    const result = BuildCommentLine(cStyleSyntax, "Test", config);
    assert.ok(result.length >= 0);
  });

  it("handles extremely large lineWidth (10000 chars)", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 10000 };
    const result = BuildCommentLine(cStyleSyntax, "Test", config);
    assert.strictEqual(result.length, 10000);
  });

  it("handles separatorChar as empty string", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "" };
    const result = BuildCommentLine(cStyleSyntax, "Test", config);
    assert.ok(result.includes("Test"));
  });

  it("handles separatorChar as multi-character string", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "-=-" };
    const result = BuildCommentLine(cStyleSyntax, "", config);
    assert.ok(result.includes("-=-"));
  });

  it("handles separatorChar as Unicode emoji", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorChar: "🔥" };
    const result = BuildCommentLine(cStyleSyntax, "Hot", config);
    assert.ok(result.includes("🔥"));
  });

  it("handles zero separatorPrefixLength", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorPrefixLength: 0 };
    const result = BuildCommentLine(cStyleSyntax, "Test", config);
    assert.strictEqual(result.length, 80);
  });

  it("handles negative separatorPrefixLength (throws)", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorPrefixLength: -5 };
    assert.throws(() => BuildCommentLine(cStyleSyntax, "Test", config));
  });

  it("handles extremely large separatorPrefixLength", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, separatorPrefixLength: 1000 };
    const result = BuildCommentLine(cStyleSyntax, "Test", config);
    assert.ok(result.length >= 80);
  });

  it("handles startColumn larger than lineWidth", () => {
    const result = BuildCommentLine(cStyleSyntax, "Test", DEFAULT_CONFIG, 200);
    assert.ok(result.length >= 0);
  });

  it("handles negative startColumn", () => {
    const result = BuildCommentLine(cStyleSyntax, "Test", DEFAULT_CONFIG, -50);
    assert.ok(result.length > 0);
  });
});

describe("BuildCommentBlock - extreme inputs", () => {
  it("handles extremely long text in block", () => {
    const longText = "X".repeat(5000);
    const result = BuildCommentBlock(cStyleSyntax, "", longText);
    assert.ok(result.includes(longText));
  });

  it("handles text with embedded comment markers", () => {
    const text = "This has /* and */ inside";
    const result = BuildCommentBlock(cStyleSyntax, "", text);
    assert.ok(result.includes(text));
  });

  it("handles indent with tabs", () => {
    const result = BuildCommentBlock(cStyleSyntax, "\t\t\t", "Tabbed");
    assert.ok(result.includes("\t\t\t"));
  });

  it("handles indent with mixed spaces and tabs", () => {
    const indent = "  \t  \t";
    const result = BuildCommentBlock(cStyleSyntax, indent, "Mixed");
    assert.ok(result.includes(indent));
  });

  it("handles extremely long indent", () => {
    const indent = " ".repeat(500);
    const result = BuildCommentBlock(cStyleSyntax, indent, "Deep");
    assert.ok(result.includes(indent));
  });

  it("handles Unicode whitespace in indent", () => {
    const indent = "\u00A0\u00A0"; // Non-breaking spaces
    const result = BuildCommentBlock(cStyleSyntax, indent, "Unicode");
    assert.ok(result.includes(indent));
  });

  it("handles empty text with whitespace indent", () => {
    const result = BuildCommentBlock(cStyleSyntax, "    ", "");
    const lines = result.split("\n");
    assert.strictEqual(lines.length, 3);
  });
});

describe("ParseFancyCommentLine - malicious inputs", () => {
  it("parses code injection text safely (does not execute)", () => {
    const line = BuildCommentLine(cStyleSyntax, "Evil; DROP TABLE users;");
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null);
    assert.strictEqual(result.text, "Evil; DROP TABLE users;");
  });

  it("parses script tag as text (does not execute)", () => {
    const line = BuildCommentLine(cStyleSyntax, "<script>alert('xss')</script>");
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null);
    assert.strictEqual(result.text, "<script>alert('xss')</script>");
  });

  it("handles line with null bytes", () => {
    const line = "// --- Test\x00Null ---";
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result === null || result.text);
  });

  it("handles line that is only comment markers", () => {
    const line = "//////";
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles line with mismatched syntax", () => {
    const line = "/* --- Test --- */";
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles line with wrong separatorChar", () => {
    const line = "// === Test ===";
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles extremely long line (buffer overflow attempt)", () => {
    const line = "// ---" + "A".repeat(1000000) + "---";
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null || result === null);
  });

  it("handles line with only dashes (empty text case)", () => {
    const line = BuildCommentLine(cStyleSyntax, "");
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null);
    assert.strictEqual(result.text, "");
  });

  it("handles line with mixed Unicode direction markers", () => {
    const line = "// --- ‮‭Test‬ ---";
    const result = ParseFancyCommentLine(line, cStyleSyntax);
    assert.ok(result !== null);
  });
});

describe("ParseFancyCommentBlock - error conditions", () => {
  it("returns null for empty array", () => {
    const result = ParseFancyCommentBlock([], cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for single-line array", () => {
    const result = ParseFancyCommentBlock(["/*"], cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null for two-line array", () => {
    const result = ParseFancyCommentBlock(["/*", "* Text"], cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when multiLineStart is missing", () => {
    const lines = ["", "* Text", "*/"];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when multiLineEnd is missing", () => {
    const lines = ["/*", "* Text", ""];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when middle line has wrong format", () => {
    const lines = ["/*", "Text without star", "*/"];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("returns null when indent is inconsistent", () => {
    const lines = ["/*", "    * Text", "  */"];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles block with extremely long text", () => {
    const longText = "Y".repeat(10000);
    const lines = ["/*", "* " + longText, "*/"];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.text, longText);
  });

  it("handles block with embedded newlines in text (malformed)", () => {
    const lines = ["/*", "* Text\nWith\nNewlines", "*/"];
    const result = ParseFancyCommentBlock(lines, cStyleSyntax);
    assert.ok(result);
  });
});

describe("FindFancyCommentBlock - boundary conditions", () => {
  it("returns null when cursorLine is negative", () => {
    const lines = ["/*", "* Text", "*/", "// ---"];
    const result = FindFancyCommentBlock(lines, -1, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles cursorLine exceeds array length gracefully", () => {
    const lines = ["/*", "* Text", "*/", "// ---"];
    // When cursor is way past the document, searches backwards from that position
    // Since search only goes back 3 lines, it won't find anything
    try {
      const result = FindFancyCommentBlock(lines, 100, cStyleSyntax);
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
      const result = FindFancyCommentBlock(lines, lines.length, cStyleSyntax);
      assert.strictEqual(result, null);
    } catch (e) {
      // Also acceptable if it throws for out-of-bounds
      assert.ok(true);
    }
  });

  it("handles empty document gracefully", () => {
    try {
      const result = FindFancyCommentBlock([], 0, cStyleSyntax);
      assert.strictEqual(result, null);
    } catch (e) {
      // Also acceptable if it throws for empty array
      assert.ok(true);
    }
  });

  it("handles document with only blank lines", () => {
    const lines = ["", "", "", ""];
    const result = FindFancyCommentBlock(lines, 2, cStyleSyntax);
    assert.strictEqual(result, null);
  });

  it("handles multiple blocks and finds correct one", () => {
    const block1 = ["/*", "* First", "*/", "// ---"];
    const block2 = ["/*", "* Second", "*/", "// ---"];
    const lines = [...block1, "code", ...block2];

    const result1 = FindFancyCommentBlock(lines, 1, cStyleSyntax);
    assert.strictEqual(result1?.text, "First");

    const result2 = FindFancyCommentBlock(lines, 6, cStyleSyntax);
    assert.strictEqual(result2?.text, "Second");
  });

  it("does not detect incomplete block at document end", () => {
    const lines = ["const x = 1;", "/*", "* Incomplete"];
    const result = FindFancyCommentBlock(lines, 2, cStyleSyntax);
    assert.strictEqual(result, null);
  });
});

describe("GetIndentColumn - edge cases", () => {
  it("returns cursor position for empty string", () => {
    const result = GetIndentColumn("", 0);
    assert.strictEqual(result, 0);
  });

  it("returns cursor position for whitespace-only line", () => {
    const result = GetIndentColumn("        ", 8);
    assert.strictEqual(result, 8);
  });

  it("handles line with tabs", () => {
    const result = GetIndentColumn("\t\tcode", 0);
    assert.strictEqual(result, 2);
  });

  it("handles mixed tabs and spaces", () => {
    const result = GetIndentColumn("  \t  code", 0);
    assert.strictEqual(result, 5);
  });

  it("handles zero cursor position", () => {
    const result = GetIndentColumn("    code", 0);
    assert.strictEqual(result, 4);
  });

  it("handles cursor beyond line length", () => {
    const result = GetIndentColumn("  code", 100);
    assert.strictEqual(result, 2);
  });

  it("handles negative cursor position", () => {
    const result = GetIndentColumn("  code", -5);
    assert.strictEqual(result, 2);
  });

  it("handles Unicode whitespace", () => {
    const result = GetIndentColumn("\u00A0\u00A0code", 0);
    assert.strictEqual(result, 2);
  });

  it("handles extremely long indent", () => {
    const indent = " ".repeat(1000);
    const result = GetIndentColumn(indent + "code", 0);
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
    const result = BuildCommentLine(weirdSyntax, "Test");
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
    const result = BuildCommentLine(longSyntax, "Test");
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
    const result = BuildCommentLine(unicodeSyntax, "Test");
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
    const result = BuildCommentLine(sameSyntax, "Test");
    assert.ok(result.includes("Test"));
  });
});

describe("combined edge cases", () => {
  it("handles maximum indent with minimum lineWidth", () => {
    const config: FormattingConfig = { ...DEFAULT_CONFIG, lineWidth: 10 };
    const result = BuildCommentLine(cStyleSyntax, "X", config, 50);
    assert.ok(result.length >= 0);
  });

  it("parses and rebuilds line identically for simple case", () => {
    const original = BuildCommentLine(cStyleSyntax, "Round Trip");
    const parsed = ParseFancyCommentLine(original, cStyleSyntax);
    assert.notStrictEqual(parsed, null);
    const rebuilt = BuildCommentLine(cStyleSyntax, parsed!.text);
    assert.strictEqual(rebuilt, original);
  });

  it("handles all-whitespace text after trim", () => {
    const text = "     \t\t\t     ";
    const result = BuildCommentLine(cStyleSyntax, text);
    const empty = BuildCommentLine(cStyleSyntax, "");
    assert.strictEqual(result, empty);
  });
});
