import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { BuildCommentLine, BuildCommentBlock, ParseFancyCommentLine, CommentSyntax, DEFAULT_CONFIG } from "../Source/Core/Formatting";

describe("unknown and unusual language support", () => {
  it("handles language with no single-line comment syntax", () => {
    const syntax: CommentSyntax = {
      singleLineStart: "",
      singleLineEnd: "",
      multiLineStart: "/*",
      multiLineMiddle: "*",
      multiLineEnd: "*/",
    };
    const result = BuildCommentBlock(syntax, "", "Block Only Language");
    assert.ok(result.includes("Block Only Language"));
  });

  it("handles COBOL-style comments", () => {
    const cobolSyntax: CommentSyntax = {
      singleLineStart: "*>",
      singleLineEnd: "",
      multiLineStart: "*>",
      multiLineMiddle: "*>",
      multiLineEnd: "*>",
    };
    const result = BuildCommentLine(cobolSyntax, "COBOL Comment");
    assert.ok(result.includes("COBOL Comment"));
    assert.ok(result.startsWith("*>"));
  });

  it("handles FORTRAN-style comments", () => {
    const fortranSyntax: CommentSyntax = {
      singleLineStart: "C",
      singleLineEnd: "",
      multiLineStart: "C",
      multiLineMiddle: "C",
      multiLineEnd: "C",
    };
    const result = BuildCommentLine(fortranSyntax, "FORTRAN Comment");
    assert.ok(result.includes("FORTRAN Comment"));
    assert.ok(result.startsWith("C"));
  });

  it("handles Lisp-style semicolon comments", () => {
    const lispSyntax: CommentSyntax = {
      singleLineStart: ";;",
      singleLineEnd: "",
      multiLineStart: ";;",
      multiLineMiddle: ";;",
      multiLineEnd: ";;",
    };
    const result = BuildCommentLine(lispSyntax, "Lisp Comment");
    assert.ok(result.includes("Lisp Comment"));
    assert.ok(result.startsWith(";;"));
  });

  it("handles VimScript comments", () => {
    const vimSyntax: CommentSyntax = {
      singleLineStart: "\"",
      singleLineEnd: "",
      multiLineStart: "\"",
      multiLineMiddle: "\"",
      multiLineEnd: "\"",
    };
    const result = BuildCommentLine(vimSyntax, "Vim Comment");
    assert.ok(result.includes("Vim Comment"));
  });

  it("handles Lua comments", () => {
    const luaSyntax: CommentSyntax = {
      singleLineStart: "--",
      singleLineEnd: "",
      multiLineStart: "--[[",
      multiLineMiddle: "--",
      multiLineEnd: "]]",
    };
    const result = BuildCommentLine(luaSyntax, "Lua Comment");
    assert.ok(result.includes("Lua Comment"));
    assert.ok(result.startsWith("--"));
  });

  it("handles Haskell comments", () => {
    const haskellSyntax: CommentSyntax = {
      singleLineStart: "--",
      singleLineEnd: "",
      multiLineStart: "{-",
      multiLineMiddle: " ",
      multiLineEnd: "-}",
    };
    const result = BuildCommentLine(haskellSyntax, "Haskell Comment");
    assert.ok(result.includes("Haskell Comment"));
  });

  it("handles Erlang comments", () => {
    const erlangSyntax: CommentSyntax = {
      singleLineStart: "%",
      singleLineEnd: "",
      multiLineStart: "%",
      multiLineMiddle: "%",
      multiLineEnd: "%",
    };
    const result = BuildCommentLine(erlangSyntax, "Erlang Comment");
    assert.ok(result.includes("Erlang Comment"));
  });

  it("handles MATLAB comments", () => {
    const matlabSyntax: CommentSyntax = {
      singleLineStart: "%",
      singleLineEnd: "",
      multiLineStart: "%{",
      multiLineMiddle: "%",
      multiLineEnd: "%}",
    };
    const result = BuildCommentLine(matlabSyntax, "MATLAB Comment");
    assert.ok(result.includes("MATLAB Comment"));
  });

  it("handles R comments", () => {
    const rSyntax: CommentSyntax = {
      singleLineStart: "#",
      singleLineEnd: "",
      multiLineStart: "#",
      multiLineMiddle: "#",
      multiLineEnd: "#",
    };
    const result = BuildCommentLine(rSyntax, "R Comment");
    assert.ok(result.includes("R Comment"));
    assert.ok(result.startsWith("## ---"));
  });

  it("handles Assembly comments (semicolon)", () => {
    const asmSyntax: CommentSyntax = {
      singleLineStart: ";",
      singleLineEnd: "",
      multiLineStart: ";",
      multiLineMiddle: ";",
      multiLineEnd: ";",
    };
    const result = BuildCommentLine(asmSyntax, "Assembly Comment");
    assert.ok(result.includes("Assembly Comment"));
  });

  it("handles Batch file comments", () => {
    const batchSyntax: CommentSyntax = {
      singleLineStart: "REM",
      singleLineEnd: "",
      multiLineStart: "REM",
      multiLineMiddle: "REM",
      multiLineEnd: "REM",
    };
    const result = BuildCommentLine(batchSyntax, "Batch Comment");
    assert.ok(result.includes("Batch Comment"));
  });

  it("handles PowerShell comments", () => {
    const psSyntax: CommentSyntax = {
      singleLineStart: "#",
      singleLineEnd: "",
      multiLineStart: "<#",
      multiLineMiddle: " ",
      multiLineEnd: "#>",
    };
    const result = BuildCommentLine(psSyntax, "PowerShell Comment");
    assert.ok(result.includes("PowerShell Comment"));
    assert.ok(result.startsWith("## ---"));
  });

  it("handles Clojure comments", () => {
    const clojureSyntax: CommentSyntax = {
      singleLineStart: ";;",
      singleLineEnd: "",
      multiLineStart: "(comment",
      multiLineMiddle: " ",
      multiLineEnd: ")",
    };
    const result = BuildCommentLine(clojureSyntax, "Clojure Comment");
    assert.ok(result.includes("Clojure Comment"));
  });

  it("handles Elixir comments", () => {
    const elixirSyntax: CommentSyntax = {
      singleLineStart: "#",
      singleLineEnd: "",
      multiLineStart: "@doc \"\"\"",
      multiLineMiddle: " ",
      multiLineEnd: "\"\"\"",
    };
    const result = BuildCommentLine(elixirSyntax, "Elixir Comment");
    assert.ok(result.includes("Elixir Comment"));
    assert.ok(result.startsWith("## ---"));
  });

  it("handles language with symmetric comment markers", () => {
    const symmetricSyntax: CommentSyntax = {
      singleLineStart: "(*",
      singleLineEnd: "*)",
      multiLineStart: "(*",
      multiLineMiddle: " *",
      multiLineEnd: "*)",
    };
    const result = BuildCommentLine(symmetricSyntax, "Symmetric");
    assert.ok(result.includes("Symmetric"));
    assert.ok(result.startsWith("(*"));
    assert.ok(result.endsWith("*)"));
  });
});

describe("language detection fallback scenarios", () => {
  it("handles unknown file extension gracefully", () => {
    const unknownSyntax: CommentSyntax = {
      singleLineStart: "//",
      singleLineEnd: "",
      multiLineStart: "/*",
      multiLineMiddle: "*",
      multiLineEnd: "*/",
    };
    const result = BuildCommentLine(unknownSyntax, "Unknown Language");
    assert.ok(result.includes("Unknown Language"));
  });

  it("handles language with only block comments (no single line)", () => {
    const blockOnlySyntax: CommentSyntax = {
      singleLineStart: "(*",
      singleLineEnd: "*)",
      multiLineStart: "(*",
      multiLineMiddle: " *",
      multiLineEnd: "*)",
    };
    const block = BuildCommentBlock(blockOnlySyntax, "", "Block Only");
    assert.ok(block.includes("Block Only"));
  });

  it("handles language with nested comment capability", () => {
    const nestingSyntax: CommentSyntax = {
      singleLineStart: "/*",
      singleLineEnd: "*/",
      multiLineStart: "/*",
      multiLineMiddle: "*",
      multiLineEnd: "*/",
    };
    const result = BuildCommentLine(nestingSyntax, "Nested /* comment */ inside");
    assert.ok(result.includes("Nested /* comment */ inside"));
  });
});

describe("multi-language workspace scenarios", () => {
  it("builds blocks for multiple syntaxes in sequence", () => {
    const syntaxes = [
      { singleLineStart: "//", singleLineEnd: "", multiLineStart: "/*", multiLineMiddle: "*", multiLineEnd: "*/" },
      { singleLineStart: "#", singleLineEnd: "", multiLineStart: "\"\"\"", multiLineMiddle: " ", multiLineEnd: "\"\"\"" },
      { singleLineStart: "--", singleLineEnd: "", multiLineStart: "/*", multiLineMiddle: "*", multiLineEnd: "*/" },
    ];

    for (const syntax of syntaxes) {
      const result = BuildCommentBlock(syntax, "", "Multi-Lang");
      assert.ok(result.includes("Multi-Lang"));
    }
  });

  it("parses comment from wrong language syntax returns null", () => {
    const cStyleLine = BuildCommentLine(
      { singleLineStart: "//", singleLineEnd: "", multiLineStart: "/*", multiLineMiddle: "*", multiLineEnd: "*/" },
      "C Style"
    );

    const pythonSyntax: CommentSyntax = {
      singleLineStart: "#",
      singleLineEnd: "",
      multiLineStart: "\"\"\"",
      multiLineMiddle: " ",
      multiLineEnd: "\"\"\"",
    };

    const result = ParseFancyCommentLine(cStyleLine, pythonSyntax);
    assert.strictEqual(result, null);
  });
});

describe("language-specific formatting quirks", () => {
  it("handles language with space-sensitive syntax", () => {
    const spaceSensitiveSyntax: CommentSyntax = {
      singleLineStart: "#",
      singleLineEnd: "",
      multiLineStart: "#",
      multiLineMiddle: "#",
      multiLineEnd: "#",
    };
    const result = BuildCommentLine(spaceSensitiveSyntax, "Python Indent Matters");
    assert.ok(result.startsWith("## ---"));
  });

  it("normalizes shell and Godot-style raw hash markers in blocks too", () => {
    const syntax: CommentSyntax = {
      singleLineStart: "#",
      singleLineEnd: "",
      multiLineStart: "#",
      multiLineMiddle: "#",
      multiLineEnd: "#",
    };

    const block = BuildCommentBlock(syntax, "", "Section");
    assert.deepStrictEqual(block.split("\n"), ["##", "## Section", "##"]);
  });

  it("handles language with case-sensitive comment markers", () => {
    const caseSensitiveSyntax: CommentSyntax = {
      singleLineStart: "REM",
      singleLineEnd: "",
      multiLineStart: "REM",
      multiLineMiddle: "REM",
      multiLineEnd: "REM",
    };
    const result = BuildCommentLine(caseSensitiveSyntax, "Case Matters");
    assert.ok(result.includes("REM"));
    assert.ok(!result.includes("rem"));
  });

  it("handles language requiring specific spacing after marker", () => {
    const syntax: CommentSyntax = {
      singleLineStart: "*>",
      singleLineEnd: "",
      multiLineStart: "*>",
      multiLineMiddle: "*>",
      multiLineEnd: "*>",
    };
    const result = BuildCommentLine(syntax, "COBOL needs space");
    assert.ok(result.includes("*> ---"));
  });
});

describe("regex and pattern-based language parsing", () => {
  it("handles language with regex special characters in markers", () => {
    const regexSyntax: CommentSyntax = {
      singleLineStart: "(*)",
      singleLineEnd: "(*)",
      multiLineStart: "(*)",
      multiLineMiddle: "(*)",
      multiLineEnd: "(*)",
    };
    const result = BuildCommentLine(regexSyntax, "Regex Special");
    assert.ok(result.includes("Regex Special"));
  });

  it("handles language with backslash in comment markers", () => {
    const backslashSyntax: CommentSyntax = {
      singleLineStart: "\\\\",
      singleLineEnd: "",
      multiLineStart: "\\*",
      multiLineMiddle: "\\",
      multiLineEnd: "*\\",
    };
    const result = BuildCommentLine(backslashSyntax, "Backslash");
    assert.ok(result.includes("Backslash"));
  });

  it("handles language with dollar sign in markers", () => {
    const dollarSyntax: CommentSyntax = {
      singleLineStart: "$#",
      singleLineEnd: "",
      multiLineStart: "$/*",
      multiLineMiddle: "$*",
      multiLineEnd: "*/$",
    };
    const result = BuildCommentLine(dollarSyntax, "Dollar");
    assert.ok(result.includes("Dollar"));
  });
});
