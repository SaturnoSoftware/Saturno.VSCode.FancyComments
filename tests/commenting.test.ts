import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { DEFAULT_CONFIG, parseFancyCommentLine } from "../Source/formatting";
import {
  createBlockCommentSyntax,
  createLineLikeCommentSyntax,
  extractCommentedText,
  findFancyCommentBlockWithInferredSyntax,
  inferFancyCommentBlockSyntax,
  inferFancyCommentLineSyntax,
  normalizeCommentImplementation,
  shouldUseVSCodeBlockComment,
} from "../Source/commenting";

describe("normalizeCommentImplementation", () => {
  it("defaults to vscode mode", () => {
    assert.strictEqual(normalizeCommentImplementation(undefined), "vscode");
    assert.strictEqual(normalizeCommentImplementation("other"), "vscode");
  });

  it("keeps syntax mode when requested", () => {
    assert.strictEqual(normalizeCommentImplementation("syntax"), "syntax");
  });
});

describe("shouldUseVSCodeBlockComment", () => {
  const lineSyntax = createLineLikeCommentSyntax("//");
  const blockSyntax = createBlockCommentSyntax("/*", "*/");

  it("prefers resolved line-comment syntax over VS Code's block-comment action", () => {
    assert.strictEqual(shouldUseVSCodeBlockComment("vscode", true, lineSyntax), false);
  });

  it("uses VS Code's block-comment action for block-only or unresolved syntaxes", () => {
    assert.strictEqual(shouldUseVSCodeBlockComment("vscode", true, blockSyntax), true);
    assert.strictEqual(shouldUseVSCodeBlockComment("vscode", true, null), true);
  });

  it("does not invoke VS Code's block-comment action for selections or syntax mode", () => {
    assert.strictEqual(shouldUseVSCodeBlockComment("vscode", false, blockSyntax), false);
    assert.strictEqual(shouldUseVSCodeBlockComment("syntax", true, blockSyntax), false);
  });
});

describe("extractCommentedText", () => {
  it("extracts line comment syntax from VS Code output", () => {
    const result = extractCommentedText("// hello", "hello");
    assert.deepStrictEqual(result, {
      syntax: createLineLikeCommentSyntax("//"),
      text: "hello",
    });
  });

  it("extracts C-style block syntax from VS Code output", () => {
    const result = extractCommentedText("/* hello */", "hello");
    assert.deepStrictEqual(result, {
      syntax: createBlockCommentSyntax("/*", "*/"),
      text: "hello",
    });
  });

  it("extracts JSX block syntax from VS Code output", () => {
    const result = extractCommentedText("{/* hello */}", "hello");
    assert.deepStrictEqual(result, {
      syntax: createBlockCommentSyntax("{/*", "*/}"),
      text: "hello",
    });
  });

  it("extracts comment tokens from empty commented lines", () => {
    const result = extractCommentedText("//", "");
    assert.deepStrictEqual(result, {
      syntax: createLineLikeCommentSyntax("//"),
      text: "",
    });
  });
});

describe("inferFancyCommentLineSyntax", () => {
  it("infers line comment syntax from existing fancy lines", () => {
    const line = "// --- Header ----------------------------------------------------------------";
    const syntax = inferFancyCommentLineSyntax(line, DEFAULT_CONFIG);
    assert.deepStrictEqual(syntax, createLineLikeCommentSyntax("//"));
    assert.deepStrictEqual(parseFancyCommentLine(line, syntax!, DEFAULT_CONFIG), { text: "Header" });
  });

  it("infers JSX block syntax from existing fancy lines", () => {
    const line = "{/* --- Header ----------------------------------------------------------- */}";
    const syntax = inferFancyCommentLineSyntax(line, DEFAULT_CONFIG);
    assert.deepStrictEqual(syntax, createBlockCommentSyntax("{/*", "*/}"));
    assert.deepStrictEqual(parseFancyCommentLine(line, syntax!, DEFAULT_CONFIG), { text: "Header" });
  });
});

describe("inferFancyCommentBlockSyntax", () => {
  it("infers JSX block syntax from existing fancy blocks", () => {
    const lines = ["{/*", "* Header", "*/}", "{/* ---------------------------------------------------------------------- */}"];
    assert.deepStrictEqual(inferFancyCommentBlockSyntax(lines, DEFAULT_CONFIG), createBlockCommentSyntax("{/*", "*/}"));
  });

  it("infers line-like syntax from existing fancy blocks", () => {
    const lines = ["##", "## Header", "##", "## ------------------------------------------------------------------------"];
    assert.deepStrictEqual(inferFancyCommentBlockSyntax(lines, DEFAULT_CONFIG), createLineLikeCommentSyntax("##"));
  });
});

describe("findFancyCommentBlockWithInferredSyntax", () => {
  it("finds JSX fancy blocks without a pre-resolved language syntax", () => {
    const lines = [
      "const page = () => (",
      "  <section>",
      "    {/*",
      "    * Header",
      "    */}",
      "    {/* ------------------------------------------------------------------ */}",
      "  </section>",
      ");",
    ];

    const result = findFancyCommentBlockWithInferredSyntax(lines, 4, DEFAULT_CONFIG);
    assert.deepStrictEqual(result, {
      syntax: createBlockCommentSyntax("{/*", "*/}"),
      text: "Header",
      startLine: 2,
      lineCount: 4,
    });
  });
});

describe("inferFancyCommentBlockSyntax release regressions", () => {
  it("recognizes C-style middle markers without a separating space", () => {
    const lines = ["  /*", "  *Title", "  */"];
    assert.deepStrictEqual(inferFancyCommentBlockSyntax(lines, DEFAULT_CONFIG), createBlockCommentSyntax("/*", "*/"));
  });

  it("does not infer unrelated three-line prose as a fancy block", () => {
    assert.strictEqual(inferFancyCommentBlockSyntax(["Title", "body", "footer"], DEFAULT_CONFIG), null);
  });
});
