// -------------------------------------------------------------------------- //
//                               *       +                                    //
//                         '                  |                               //
//                     ()    .-.,="``"=.    - o -                             //
//                           '=/_       \\     |                              //
//                        *   |  '=._    |                                    //
//                             \\     `=./`,        '                         //
//                          .   '=.__.=' `='      *                           //
//                                                                            //
//                                                                            //
// File      : nativeCommentBlock.test.ts                                     //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2026-09-22                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// License   : GPLv3                                                          //
// -------------------------------------------------------------------------- //

/**
 * The two defects the multi-line command was reported for, and the rule that
 * replaced them.
 *
 * B0009: any three consecutive lines were accepted as a comment block and
 * collapsed into the middle one, including three lines of working code. The
 * inference derived a candidate syntax from the literal text of the lines and
 * then confirmed that candidate against the same lines, so it could not fail.
 *
 * B0010: a real block comment around the caret was not recognised, and the
 * partial match that happened instead dropped every body line but one.
 *
 * Every case below runs against all the comment families the extension can
 * meet, because the defect was never specific to one of them: it was measured
 * in 10 of 10.
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { CommentSyntax } from "../Libraries/Saturno.VSCode.FancyLib/Source/CommentUtils";
import {
  CreateBlockCommentSyntax,
  CreateLineLikeCommentSyntax,
  FindFancyCommentBlockUsingKnownSyntaxFirst,
  FindNativeCommentBlock,
  IsCommentDelimiter,
  NormalizeNativeBlockDelimiters,
} from "../Source/Core/Commenting";
import { BuildCommentBlock, BuildCommentLine, DEFAULT_CONFIG } from "../Source/Core/Formatting";

//
// FIXTURES
//

interface Family {
  name: string;
  syntax: CommentSyntax;
  /** The language's own block comment, when it has one. */
  nativeBlock: string[] | null;
}

// Every comment shape the extension can resolve to. The line-comment families
// are the ones where a language declares a lineComment, which wins resolution;
// the block families are languages that declare only a block comment.
const FAMILIES: Family[] = [
  { name: "typescript, javascript, c, java, c#, go, rust (//)", syntax: CreateLineLikeCommentSyntax("//"), nativeBlock: ["/**", " * body one", " * body two", " */"] },
  { name: "python, shell, yaml, ruby, perl (#)", syntax: CreateLineLikeCommentSyntax("#"), nativeBlock: null },
  { name: "sql, lua, haskell, ada (--)", syntax: CreateLineLikeCommentSyntax("--"), nativeBlock: null },
  { name: "lisp, clojure, ini, asm (;)", syntax: CreateLineLikeCommentSyntax(";"), nativeBlock: null },
  { name: "latex, erlang, matlab (%)", syntax: CreateLineLikeCommentSyntax("%"), nativeBlock: null },
  { name: "vb, vbscript (')", syntax: CreateLineLikeCommentSyntax("'"), nativeBlock: null },
  { name: "css (/* */)", syntax: CreateBlockCommentSyntax("/*", "*/"), nativeBlock: ["/*", " * body one", " * body two", " */"] },
  { name: "html, xml, markdown (<!-- -->)", syntax: CreateBlockCommentSyntax("<!--", "-->"), nativeBlock: ["<!--", "  body one", "  body two", "-->"] },
  { name: "pascal, ocaml ((* *))", syntax: CreateBlockCommentSyntax("(*", "*)"), nativeBlock: ["(*", " * body one", " * body two", "*)"] },
  { name: "jsx ({/* */})", syntax: CreateBlockCommentSyntax("{/*", "*/}"), nativeBlock: ["{/*", " * body one", " * body two", "*/}"] },
];

// Content that is not a comment in any language, and must never be treated as
// one. The code sample is the exact shape from the bug report: before the fix
// it was collapsed to "first = items[0];", losing two lines and the `const`.
const PLAIN_CONTENT: Array<[string, string[]]> = [
  ["source code", ["const total = items.length;", "const first = items[0];", "return first;"]],
  ["prose", ["Dear reader,", "this is a letter.", "Sincerely, someone."]],
  ["indented code", ["    if (ready) {", "        run();", "    }"]],
  ["a markdown list", ["- first item", "- second item", "- third item"]],
];

// -----------------------------------------------------------------------------
function BuildFancyBlock(syntax: CommentSyntax, text: string): string[] {
  const block = BuildCommentBlock(syntax, "", text);
  return (block + "\n" + BuildCommentLine(syntax, "", DEFAULT_CONFIG, 0)).split("\n");
}

//
// B0009 - NOTHING THAT IS NOT A COMMENT IS EVER A BLOCK
//

describe("plain content is never recognised as a comment block", () => {
  for (const family of FAMILIES) {
    for (const [what, lines] of PLAIN_CONTENT) {
      it(`${what} stays untouched in ${family.name}`, () => {
        assert.equal(
          FindFancyCommentBlockUsingKnownSyntaxFirst(lines, 0, family.syntax, DEFAULT_CONFIG),
          null
        );
        assert.equal(FindNativeCommentBlock(lines, 0, DEFAULT_CONFIG), null);
      });
    }
  }

  it("does not collapse three lines of code into the middle one", () => {
    // The exact regression: the command used to replace all three lines with
    // "first = items[0];" - two lines destroyed and a keyword eaten.
    const code = ["const total = items.length;", "const first = items[0];", "return first;"];
    const found = FindFancyCommentBlockUsingKnownSyntaxFirst(
      code, 0, CreateLineLikeCommentSyntax("//"), DEFAULT_CONFIG
    );
    assert.equal(found, null, "three lines of code are not a comment block");
  });

  it("rejects a candidate marker that carries letters, digits or spaces", () => {
    assert.equal(IsCommentDelimiter("const total = items.length;"), false);
    assert.equal(IsCommentDelimiter("* body one"), false);
    assert.equal(IsCommentDelimiter("a"), false);
    assert.equal(IsCommentDelimiter("1"), false);
    assert.equal(IsCommentDelimiter(""), false);
    assert.equal(IsCommentDelimiter("*****"), false, "a real marker is never that long");
  });

  it("accepts every marker the supported languages actually use", () => {
    for (const token of ["//", "#", "--", ";", "%", "'", "/*", "*/", "/**", "*", "(*", "*)", "{/*", "*/}", "<!--", "-->"]) {
      assert.equal(IsCommentDelimiter(token), true, `${token} is a real comment marker`);
    }
  });
});

//
// B0010 - THE BLOCK AROUND THE CARET IS FOUND WHOLE
//

describe("a native comment block around the caret", () => {
  for (const family of FAMILIES.filter((f) => f.nativeBlock !== null)) {
    const block = family.nativeBlock as string[];

    it(`is recognised whole, with its content intact, in ${family.name}`, () => {
      const found = FindNativeCommentBlock(block, 1, DEFAULT_CONFIG);
      assert.notEqual(found, null, "the block the caret sits in must be found");
      assert.equal(found!.startLine, 0, "the opener is part of the block");
      assert.equal(found!.lineCount, block.length, "the closer is part of the block");
      assert.equal(found!.text, "body one\nbody two", "no body line is dropped");
    });

    it(`is found from any body line in ${family.name}`, () => {
      for (let caret = 0; caret < block.length; caret++) {
        const found = FindNativeCommentBlock(block, caret, DEFAULT_CONFIG);
        assert.notEqual(found, null, `caret on line ${caret + 1}`);
        assert.equal(found!.lineCount, block.length);
      }
    });
  }

  it("finds the JSDoc block reported from the extension, not three of its body lines", () => {
    // Report ded2dbd2-2158-4eb7-875d-f30d08038d18: caret on the first body
    // line of this block. The old code matched body lines 2..4 and returned
    // only the middle one.
    const lines = [
      "/**",
      " * Activation and command registration, and nothing else. The command bodies",
      " * are in Commands.ts, the About panel in About.ts, the settings in Config.ts",
      " * and ConfigResolution.ts.",
      " */",
    ];
    const found = FindNativeCommentBlock(lines, 1, DEFAULT_CONFIG);

    assert.notEqual(found, null);
    assert.equal(found!.startLine, 0);
    assert.equal(found!.lineCount, 5);
    assert.equal(
      found!.text,
      "Activation and command registration, and nothing else. The command bodies\n" +
      "are in Commands.ts, the About panel in About.ts, the settings in Config.ts\n" +
      "and ConfigResolution.ts."
    );
  });

  it("does not leave an orphan marker behind, which would break the file", () => {
    // In CSS the old partial match started at the first body line and ran to
    // the end, so the opening `/*` was orphaned and the source stopped being
    // valid CSS - not merely shorter.
    //
    // Asserting only where the match ENDS is not enough to catch that: the
    // old partial match ended in the right place. The start is what moved.
    const css = ["/*", " * Layout tokens", " * Do not reorder", " */"];
    const found = FindNativeCommentBlock(css, 1, DEFAULT_CONFIG);

    assert.notEqual(found, null);
    assert.equal(found!.startLine, 0, "the opening marker is inside the replaced range");
    assert.equal(found!.startLine + found!.lineCount, css.length, "so is the closing marker");
    assert.equal(found!.text, "Layout tokens\nDo not reorder", "and every body line survives");
  });

  it("ignores a block that closed before the caret", () => {
    const lines = ["/*", " * done", " */", "", "const x = 1;"];
    assert.equal(FindNativeCommentBlock(lines, 4, DEFAULT_CONFIG), null);
  });
});

//
// THE SETTING
//

describe("nativeBlockDelimiters", () => {
  it("defaults to preserve, including for an unknown value", () => {
    assert.equal(NormalizeNativeBlockDelimiters(undefined), "preserve");
    assert.equal(NormalizeNativeBlockDelimiters("nonsense"), "preserve");
    assert.equal(NormalizeNativeBlockDelimiters("preserve"), "preserve");
    assert.equal(NormalizeNativeBlockDelimiters("languageDefault"), "languageDefault");
  });

  it("preserve keeps a C-style block a block, where languageDefault would not", () => {
    const jsdoc = ["/**", " * body one", " * body two", " */"];
    const found = FindNativeCommentBlock(jsdoc, 1, DEFAULT_CONFIG);
    assert.notEqual(found, null);

    const preserved = BuildFancyBlock(found!.syntax, found!.text);
    const language_default = BuildFancyBlock(CreateLineLikeCommentSyntax("//"), found!.text);

    assert.ok(preserved[0].startsWith("/*"), "preserve keeps the block opener");
    assert.ok(language_default[0].startsWith("//"), "languageDefault uses the line comment");

    for (const rendered of [preserved, language_default]) {
      assert.ok(rendered.join("\n").includes("body one"), "content survives either way");
      assert.ok(rendered.join("\n").includes("body two"), "content survives either way");
    }
  });

  it("gives the same answer both ways where the language's default already is a block", () => {
    // CSS, HTML and JSX have no line comment, so the setting cannot change
    // anything for them. This is the claim the setting's description makes.
    for (const family of FAMILIES.filter((f) => f.nativeBlock && f.syntax.singleLineEnd !== "")) {
      const found = FindNativeCommentBlock(family.nativeBlock as string[], 1, DEFAULT_CONFIG);
      assert.notEqual(found, null, family.name);
      assert.equal(found!.syntax.multiLineStart, family.syntax.multiLineStart, family.name);
      assert.equal(found!.syntax.singleLineEnd, family.syntax.singleLineEnd, family.name);
    }
  });
});

//
// NO REGRESSION ON WHAT ALREADY WORKED
//

describe("a fancy block this extension generated", () => {
  for (const family of FAMILIES) {
    it(`still round-trips back to its text in ${family.name}`, () => {
      const built = BuildFancyBlock(family.syntax, "Hello world");
      const found = FindFancyCommentBlockUsingKnownSyntaxFirst(built, 1, family.syntax, DEFAULT_CONFIG);

      assert.notEqual(found, null, "a generated block must still be recognised");
      assert.equal(found!.text, "Hello world");
      assert.equal(found!.startLine, 0);
    });

    it(`survives a second round-trip unchanged in ${family.name}`, () => {
      const once = BuildFancyBlock(family.syntax, "Hello world");
      const found = FindFancyCommentBlockUsingKnownSyntaxFirst(once, 1, family.syntax, DEFAULT_CONFIG);
      const twice = BuildFancyBlock(family.syntax, found!.text);

      assert.deepEqual(twice, once, "building from the parsed text reproduces the block");
    });
  }
});
