import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { DEFAULT_CONFIG, ParseFancyCommentLine } from "../Source/Core/Formatting";
import {
  CreateBlockCommentSyntax,
  CreateLineLikeCommentSyntax,
  ExtractCommentedText,
  FindFancyCommentBlockWithInferredSyntax,
  InferFancyCommentBlockSyntax,
  InferFancyCommentLineSyntax,
  NormalizeCommentImplementation,
  ShouldUseVSCodeBlockComment,
} from "../Source/Core/Commenting";

describe("NormalizeCommentImplementation", () => {
  it("defaults to vscode mode", () => {
    assert.strictEqual(NormalizeCommentImplementation(undefined), "vscode");
    assert.strictEqual(NormalizeCommentImplementation("other"), "vscode");
  });

  it("keeps syntax mode when requested", () => {
    assert.strictEqual(NormalizeCommentImplementation("syntax"), "syntax");
  });
});

describe("ShouldUseVSCodeBlockComment", () => {
  const lineSyntax = CreateLineLikeCommentSyntax("//");
  const blockSyntax = CreateBlockCommentSyntax("/*", "*/");

  it("prefers resolved line-comment syntax over VS Code's block-comment action", () => {
    assert.strictEqual(ShouldUseVSCodeBlockComment("vscode", true, lineSyntax), false);
  });

  it("uses VS Code's block-comment action for block-only or unresolved syntaxes", () => {
    assert.strictEqual(ShouldUseVSCodeBlockComment("vscode", true, blockSyntax), true);
    assert.strictEqual(ShouldUseVSCodeBlockComment("vscode", true, null), true);
  });

  it("does not invoke VS Code's block-comment action for selections or syntax mode", () => {
    assert.strictEqual(ShouldUseVSCodeBlockComment("vscode", false, blockSyntax), false);
    assert.strictEqual(ShouldUseVSCodeBlockComment("syntax", true, blockSyntax), false);
  });
});

describe("ExtractCommentedText", () => {
  it("extracts line comment syntax from VS Code output", () => {
    const result = ExtractCommentedText("// hello", "hello");
    assert.deepStrictEqual(result, {
      syntax: CreateLineLikeCommentSyntax("//"),
      text: "hello",
    });
  });

  it("extracts C-style block syntax from VS Code output", () => {
    const result = ExtractCommentedText("/* hello */", "hello");
    assert.deepStrictEqual(result, {
      syntax: CreateBlockCommentSyntax("/*", "*/"),
      text: "hello",
    });
  });

  it("extracts JSX block syntax from VS Code output", () => {
    const result = ExtractCommentedText("{/* hello */}", "hello");
    assert.deepStrictEqual(result, {
      syntax: CreateBlockCommentSyntax("{/*", "*/}"),
      text: "hello",
    });
  });

  it("extracts comment tokens from empty commented lines", () => {
    const result = ExtractCommentedText("//", "");
    assert.deepStrictEqual(result, {
      syntax: CreateLineLikeCommentSyntax("//"),
      text: "",
    });
  });
});

describe("InferFancyCommentLineSyntax", () => {
  it("infers line comment syntax from existing fancy lines", () => {
    const line = "// --- Header ----------------------------------------------------------------";
    const syntax = InferFancyCommentLineSyntax(line, DEFAULT_CONFIG);
    assert.deepStrictEqual(syntax, CreateLineLikeCommentSyntax("//"));
    assert.deepStrictEqual(ParseFancyCommentLine(line, syntax!, DEFAULT_CONFIG), { text: "Header" });
  });

  it("infers JSX block syntax from existing fancy lines", () => {
    const line = "{/* --- Header ----------------------------------------------------------- */}";
    const syntax = InferFancyCommentLineSyntax(line, DEFAULT_CONFIG);
    assert.deepStrictEqual(syntax, CreateBlockCommentSyntax("{/*", "*/}"));
    assert.deepStrictEqual(ParseFancyCommentLine(line, syntax!, DEFAULT_CONFIG), { text: "Header" });
  });
});

describe("InferFancyCommentBlockSyntax", () => {
  it("infers JSX block syntax from existing fancy blocks", () => {
    const lines = ["{/*", "* Header", "*/}", "{/* ---------------------------------------------------------------------- */}"];
    assert.deepStrictEqual(InferFancyCommentBlockSyntax(lines, DEFAULT_CONFIG), CreateBlockCommentSyntax("{/*", "*/}"));
  });

  it("infers line-like syntax from existing fancy blocks", () => {
    const lines = ["##", "## Header", "##", "## ------------------------------------------------------------------------"];
    assert.deepStrictEqual(InferFancyCommentBlockSyntax(lines, DEFAULT_CONFIG), CreateLineLikeCommentSyntax("##"));
  });
});

describe("FindFancyCommentBlockWithInferredSyntax", () => {
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

    const result = FindFancyCommentBlockWithInferredSyntax(lines, 4, DEFAULT_CONFIG);
    assert.deepStrictEqual(result, {
      syntax: CreateBlockCommentSyntax("{/*", "*/}"),
      text: "Header",
      startLine: 2,
      lineCount: 4,
    });
  });
});

describe("InferFancyCommentBlockSyntax release regressions", () => {
  it("recognizes C-style middle markers without a separating space", () => {
    const lines = ["  /*", "  *Title", "  */"];
    assert.deepStrictEqual(InferFancyCommentBlockSyntax(lines, DEFAULT_CONFIG), CreateBlockCommentSyntax("/*", "*/"));
  });

  it("does not infer unrelated three-line prose as a fancy block", () => {
    assert.strictEqual(InferFancyCommentBlockSyntax(["Title", "body", "footer"], DEFAULT_CONFIG), null);
  });
});
