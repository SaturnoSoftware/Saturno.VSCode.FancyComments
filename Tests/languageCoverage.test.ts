import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  BuildCommentBlock,
  BuildCommentLine,
  CommentSyntax,
  ParseFancyCommentBlock,
  ParseFancyCommentLine,
} from "../Source/Core/Formatting";

interface LanguageFixture {
  name: string;
  syntax: CommentSyntax;
}

function lineComment(start: string): CommentSyntax {
  return {
    singleLineStart: start,
    singleLineEnd: "",
    multiLineStart: start,
    multiLineMiddle: start,
    multiLineEnd: start,
  };
}

function blockComment(open: string, middle: string, close: string): CommentSyntax {
  return {
    singleLineStart: open,
    singleLineEnd: close,
    multiLineStart: open,
    multiLineMiddle: middle,
    multiLineEnd: close,
  };
}

const cStyle = lineComment("//");
const hashStyle = lineComment("#");
const sqlStyle = lineComment("--");
const semicolonStyle = lineComment(";");
const htmlStyle = blockComment("<!--", " ", "-->");

const languages: LanguageFixture[] = [
  { name: "C", syntax: cStyle },
  { name: "C++", syntax: cStyle },
  { name: "C#", syntax: cStyle },
  { name: "Java", syntax: cStyle },
  { name: "Python", syntax: hashStyle },
  { name: "JavaScript", syntax: cStyle },
  { name: "TypeScript", syntax: cStyle },
  { name: "Go", syntax: cStyle },
  { name: "Rust", syntax: cStyle },
  { name: "Swift", syntax: cStyle },
  { name: "Kotlin", syntax: cStyle },
  { name: "Dart", syntax: cStyle },
  { name: "Zig", syntax: cStyle },
  { name: "Nim", syntax: hashStyle },
  { name: "Crystal", syntax: hashStyle },
  { name: "Julia", syntax: hashStyle },
  { name: "V", syntax: cStyle },
  { name: "Odin", syntax: cStyle },
  { name: "Elm", syntax: sqlStyle },
  { name: "PHP", syntax: cStyle },
  { name: "Ruby", syntax: hashStyle },
  { name: "Scala", syntax: cStyle },
  { name: "Elixir", syntax: hashStyle },
  { name: "D", syntax: cStyle },
  { name: "Assembly", syntax: semicolonStyle },
  { name: "GDScript", syntax: hashStyle },
  { name: "Lua", syntax: sqlStyle },
  { name: "Haxe", syntax: cStyle },
  { name: "PowerShell", syntax: hashStyle },
  { name: "Bash", syntax: hashStyle },
  { name: "Perl", syntax: hashStyle },
  { name: "Tcl", syntax: hashStyle },
  { name: "Haskell", syntax: sqlStyle },
  { name: "F#", syntax: cStyle },
  { name: "OCaml", syntax: blockComment("(*", "*", "*)") },
  { name: "Erlang", syntax: lineComment("%") },
  { name: "Clojure", syntax: semicolonStyle },
  { name: "Scheme", syntax: semicolonStyle },
  { name: "Racket", syntax: semicolonStyle },
  { name: "R", syntax: hashStyle },
  { name: "MATLAB", syntax: lineComment("%") },
  { name: "Wolfram Language", syntax: blockComment("(*", "*", "*)") },
  { name: "COBOL", syntax: lineComment("*>") },
  { name: "ABAP", syntax: lineComment("\"") },
  { name: "SQL", syntax: sqlStyle },
  { name: "PL/SQL", syntax: sqlStyle },
  { name: "T-SQL", syntax: sqlStyle },
  { name: "Ada", syntax: sqlStyle },
  { name: "Verilog", syntax: cStyle },
  { name: "VHDL", syntax: sqlStyle },
  { name: "Groovy", syntax: cStyle },
  { name: "Visual Basic .NET", syntax: lineComment("'") },
  { name: "BASIC", syntax: lineComment("'") },
  { name: "Visual Basic", syntax: lineComment("'") },
  { name: "Pascal", syntax: blockComment("{", "{", "}") },
  { name: "Delphi/Object Pascal", syntax: cStyle },
  { name: "Fortran", syntax: lineComment("!") },
  { name: "Lisp", syntax: semicolonStyle },
  { name: "Prolog", syntax: lineComment("%") },
  { name: "Smalltalk", syntax: blockComment("\"", "\"", "\"") },
  { name: "Objective-C", syntax: cStyle },
  { name: "HTML", syntax: htmlStyle },
  { name: "XML", syntax: htmlStyle },
  { name: "JSONC", syntax: cStyle },
  { name: "YAML", syntax: hashStyle },
  { name: "TOML", syntax: hashStyle },
  { name: "INI", syntax: semicolonStyle },
  { name: "Markdown", syntax: htmlStyle },
  { name: "GLSL", syntax: cStyle },
  { name: "HLSL", syntax: cStyle },
  { name: "WGSL", syntax: cStyle },
  { name: "OpenCL C", syntax: cStyle },
  { name: "CUDA", syntax: cStyle },
  { name: "QML", syntax: cStyle },
  { name: "Solidity", syntax: cStyle },
];

describe("language comment coverage", () => {
  for (const language of languages) {
    it(`roundtrips single-line comments for ${language.name}`, () => {
      const line = BuildCommentLine(language.syntax, "Section");
      const parsed = ParseFancyCommentLine(line, language.syntax);

      assert.strictEqual(line.length, 80);
      assert.deepStrictEqual(parsed, { text: "Section" });
    });

    it(`roundtrips multi-line comments for ${language.name}`, () => {
      const block = BuildCommentBlock(language.syntax, "", "Section");
      const separator = BuildCommentLine(language.syntax, "");
      const parsed = ParseFancyCommentBlock([...block.split("\n"), separator], language.syntax);

      assert.deepStrictEqual(parsed, { text: "Section", lineCount: 4 });
    });
  }

  it("uses JSONC coverage because standard JSON has no comments", () => {
    const line = BuildCommentLine(cStyle, "JSONC Section");
    assert.deepStrictEqual(ParseFancyCommentLine(line, cStyle), { text: "JSONC Section" });
  });
});
