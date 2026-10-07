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
// File      : Commenting.ts                                                  //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2026-09-03                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// License   : GPLv3                                                          //
// -------------------------------------------------------------------------- //

/**
 * Recognising a fancy comment that is already on the page.
 *
 * Formatting.ts can build and parse given a CommentSyntax. This file is the
 * step before that: working out which syntax a line or a block was written
 * in, including when VS Code's own language data does not know the language
 * or the file was written by a different editor. Every inference is
 * confirmed by round-tripping it through Formatting.ts's parser, so a guess
 * that does not reproduce the text is rejected rather than applied.
 */

// -----------------------------------------------------------------------------
import { CommentSyntax } from "../../Libraries/Saturno.VSCode.FancyLib/Source/CommentUtils";
import {
  DEFAULT_CONFIG,
  FindFancyCommentBlock,
  FormattingConfig,
  ParseFancyCommentBlock,
  ParseFancyCommentLine,
} from "./Formatting";

//
// TYPES
//

/**
 * Which engine turns a line into a comment: VS Code's own comment commands
 * ("vscode"), or this extension's syntax resolver ("syntax"). Settings can
 * hold anything, so anything that is not "syntax" is the default.
 */
// -----------------------------------------------------------------------------
export type CommentImplementation = "syntax" | "vscode";

/**
 * What to do with the delimiters of an existing block comment the command is
 * asked to rewrite.
 *
 * "preserve" keeps the block's own markers, so a C-style block stays a
 * C-style block even in a language whose default comment is a line comment.
 * "languageDefault" rewrites it with whatever the language resolves to.
 *
 * The two are identical wherever the language's default comment already is a
 * block - CSS, HTML, JSX. They differ only where a line comment wins the
 * resolution, which is every C-family language.
 */
// -----------------------------------------------------------------------------
export type NativeBlockDelimiters = "preserve" | "languageDefault";

// -----------------------------------------------------------------------------
export interface ResolvedCommentText {
  syntax: CommentSyntax;
  text: string;
}

// -----------------------------------------------------------------------------
export interface FoundFancyCommentBlock {
  syntax: CommentSyntax;
  text: string;
  startLine: number;
  lineCount: number;
}


// -----------------------------------------------------------------------------
export function NormalizeCommentImplementation(value: string | undefined): CommentImplementation {
  return value === "syntax" ? "syntax" : "vscode";
}

// -----------------------------------------------------------------------------
export function NormalizeNativeBlockDelimiters(value: string | undefined): NativeBlockDelimiters {
  return value === "languageDefault" ? "languageDefault" : "preserve";
}

// -----------------------------------------------------------------------------
export function ShouldUseVSCodeBlockComment(
  implementation: CommentImplementation,
  selectionIsEmpty: boolean,
  syntax: CommentSyntax | null
): boolean {
  return implementation === "vscode" && selectionIsEmpty && syntax?.singleLineEnd !== "";
}

// -----------------------------------------------------------------------------
export function CreateLineLikeCommentSyntax(token: string): CommentSyntax {
  return {
    singleLineStart: token,
    singleLineEnd: "",
    multiLineStart: token,
    multiLineMiddle: token,
    multiLineEnd: token,
  };
}

// -----------------------------------------------------------------------------
export function CreateBlockCommentSyntax(open: string, close: string): CommentSyntax {
  return {
    singleLineStart: open,
    singleLineEnd: close,
    multiLineStart: open,
    multiLineMiddle: open[open.length - 1] ?? open,
    multiLineEnd: close,
  };
}

// -----------------------------------------------------------------------------
export function ExtractCommentedText(commentedText: string, originalText: string): ResolvedCommentText | null {
  const commented = commentedText.trim();
  const original = originalText.trim();

  if (commented.length === 0) {
    return null;
  }

  if (original.length === 0) {
    return _ExtractCommentedTextWithoutOriginal(commented);
  }

  const bodyIndex = commented.indexOf(original);
  if (bodyIndex < 0) {
    return null;
  }

  let prefix = commented.slice(0, bodyIndex);
  let suffix = commented.slice(bodyIndex + original.length);

  if (prefix.endsWith(" ")) {
    prefix = prefix.slice(0, -1);
  }

  if (suffix.startsWith(" ")) {
    suffix = suffix.slice(1);
  }

  if (prefix.length === 0) {
    return null;
  }

  return {
    syntax: suffix.length === 0
      ? CreateLineLikeCommentSyntax(prefix)
      : CreateBlockCommentSyntax(prefix, suffix),
    text: original,
  };
}

// -----------------------------------------------------------------------------
export function InferFancyCommentLineSyntax(
  line: string,
  config: FormattingConfig = DEFAULT_CONFIG
): CommentSyntax | null {
  const trimmed = line.trimStart();
  const prefixMarker = " " + config.separatorChar.repeat(config.separatorPrefixLength);
  const prefixIndex = trimmed.indexOf(prefixMarker);

  if (prefixIndex <= 0) {
    return null;
  }

  const startToken = trimmed.slice(0, prefixIndex);
  const lineSyntax = CreateLineLikeCommentSyntax(startToken);
  if (ParseFancyCommentLine(line, lineSyntax, config) !== null) {
    return lineSyntax;
  }

  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= prefixIndex) {
    return null;
  }

  const endToken = trimmed.slice(lastSpace + 1);
  const blockSyntax = CreateBlockCommentSyntax(startToken, endToken);

  return ParseFancyCommentLine(line, blockSyntax, config) !== null ? blockSyntax : null;
}

// -----------------------------------------------------------------------------
/**
 * Whether a token could be a comment marker at all.
 *
 * A comment marker is punctuation: the slash-star family, `//`, `#`, `--`,
 * `;`, `%`, the single quote, the angle-bang of HTML. It never contains a
 * letter, a digit or a space, and it is never long.
 *
 * Without this test the inference below is circular: it derives a candidate
 * syntax from the literal text of three lines and then confirms that
 * candidate against those same three lines, which cannot fail. That is how
 * three lines of ordinary source code were being recognised as a comment
 * block and collapsed into one.
 */
// -----------------------------------------------------------------------------
export function IsCommentDelimiter(token: string): boolean {
  return /^[^\w\s]{1,4}$/.test(token);
}

/**
 * Works out which comment syntax a block on the page was written in.
 *
 * Every branch ends at ParseFancyCommentBlock, which re-reads the block with
 * the candidate syntax. That check only means something because the tokens
 * reaching it have already been constrained to look like comment markers.
 */
// -----------------------------------------------------------------------------
export function InferFancyCommentBlockSyntax(
  lines: string[],
  config: FormattingConfig = DEFAULT_CONFIG
): CommentSyntax | null {
  if (lines.length < 3) {
    return null;
  }

  const start_token = lines[0].trimStart();
  const indent = lines[0].slice(0, lines[0].length - start_token.length);
  if (!IsCommentDelimiter(start_token)) {
    return null;
  }

  // Delimited blocks, including the `/**` of a JSDoc comment.
  //
  // Two conventions coexist for where the body and the closer sit, and both
  // are common enough that guessing one would break the other:
  //
  //     /*          /**
  //     *Title       * Title
  //     */           */
  //
  // The closer is flush with the opener in the first and one column past it
  // in the second, and the body marker follows the same offset. Rather than
  // pick, every combination is offered to ParseFancyCommentBlock and the one
  // that actually re-reads the block is the answer.
  const closers = _MatchingBlockClosers(start_token);
  if (closers !== null) {
    for (const closer of closers) {
      for (const middle of [closer.startsWith(" ") ? " *" : "*", "*", " *", ""]) {
        const syntax: CommentSyntax = {
          singleLineStart: start_token,
          singleLineEnd: closer.trimStart(),
          multiLineStart: start_token,
          multiLineMiddle: middle,
          multiLineEnd: closer,
        };
        if (ParseFancyCommentBlock(lines, syntax, config) !== null) {
          return syntax;
        }
      }
    }
    return null;
  }

  // Line-like blocks repeat the same marker on every line. This accepts
  // `##Title` as well as `## Title`.
  const line_like = CreateLineLikeCommentSyntax(start_token);
  if (lines[1].startsWith(indent + start_token)) {
    const end_index = lines.findIndex((line, index) => index >= 2 && line === indent + start_token);
    if (end_index >= 2 && ParseFancyCommentBlock(lines, line_like, config) !== null) {
      return line_like;
    }
  }

  // Any other block whose middle marker is separated from the content. Both
  // ends have to be real markers, which is what stops prose from qualifying.
  const end_token = lines[2].trimStart();
  const middle_remainder = lines[1].slice(indent.length);
  const middle_space = middle_remainder.indexOf(" ");
  if (middle_space <= 0 || !IsCommentDelimiter(end_token)) {
    return null;
  }

  const middle_token = middle_remainder.slice(0, middle_space);
  if (!IsCommentDelimiter(middle_token)) {
    return null;
  }

  const syntax: CommentSyntax = {
    singleLineStart: start_token,
    singleLineEnd: end_token,
    multiLineStart: start_token,
    multiLineMiddle: middle_token,
    multiLineEnd: end_token,
  };
  return ParseFancyCommentBlock(lines, syntax, config) !== null ? syntax : null;
}

/**
 * The closing marker for a block opener, and null for anything that does
 * not open a block. The leading space on the C-style closer is how a JSDoc
 * closing marker lines up one column past its opener.
 */
// -----------------------------------------------------------------------------
function _MatchingBlockClosers(startToken: string): string[] | null {
  switch (startToken) {
    case "/*":
    case "/**": return ["*/", " */"];
    case "{/*": return ["*/}", " */}"];
    case "(*":  return ["*)", " *)"];
    case "<!--": return ["-->", " -->"];
    default: return null;
  }
}

// -----------------------------------------------------------------------------
export function FindFancyCommentBlockWithInferredSyntax(
  lines: string[],
  cursorLine: number,
  config: FormattingConfig = DEFAULT_CONFIG
): FoundFancyCommentBlock | null {
  const searchStart = 0;

  for (let i = cursorLine; i >= searchStart; i--) {
    const syntax = InferFancyCommentBlockSyntax(lines.slice(i), config);
    if (!syntax) {
      continue;
    }

    const parsed = ParseFancyCommentBlock(lines.slice(i), syntax, config);
    if (!parsed) {
      continue;
    }

    const blockEnd = i + parsed.lineCount - 1;
    if (cursorLine > blockEnd) {
      continue;
    }

    return {
      syntax,
      text: parsed.text,
      startLine: i,
      lineCount: parsed.lineCount,
    };
  }

  return null;
}

// -----------------------------------------------------------------------------
export function FindFancyCommentBlockUsingKnownSyntaxFirst(
  lines: string[],
  cursorLine: number,
  syntax: CommentSyntax | null,
  config: FormattingConfig = DEFAULT_CONFIG
): FoundFancyCommentBlock | null {
  if (syntax) {
    const found = FindFancyCommentBlock(lines, cursorLine, syntax, config);
    if (found !== null) {
      return { syntax, ...found };
    }
  }

  return FindFancyCommentBlockWithInferredSyntax(lines, cursorLine, config);
}

//
// NATIVE BLOCKS
//

/**
 * The comment block the caret sits inside, when that block is the
 * language's own and not one this extension generated.
 *
 * This is what makes the multi-line command act on the block the user can
 * see, instead of on the single line the caret happens to be on. It returns
 * the whole block - opener, body, closer - and the body text with every
 * marker stripped, so the caller can rebuild it without losing a line.
 *
 * It is deliberately a separate search from the fancy-block one: a fancy
 * block is toggled back to plain text, while a native block is rewritten.
 * Those are different outcomes and must not be decided by the same code.
 */
// -----------------------------------------------------------------------------
export function FindNativeCommentBlock(
  lines: string[],
  cursorLine: number,
  config: FormattingConfig = DEFAULT_CONFIG
): FoundFancyCommentBlock | null {
  for (let start = cursorLine; start >= 0; start--) {
    const opener = lines[start].trimStart();
    if (_MatchingBlockClosers(opener) === null) {
      continue;
    }

    const syntax = InferFancyCommentBlockSyntax(lines.slice(start), config);
    if (!syntax) {
      continue;
    }

    const parsed = ParseFancyCommentBlock(lines.slice(start), syntax, config);
    if (!parsed) {
      continue;
    }

    // The caret has to be inside the block that was found, not merely after
    // some block that closed earlier in the file.
    if (cursorLine > start + parsed.lineCount - 1) {
      continue;
    }

    return { syntax, text: _Dedent(parsed.text), startLine: start, lineCount: parsed.lineCount };
  }

  return null;
}

/**
 * Removes the indentation the body lines share.
 *
 * A marker-led body needs no help: stripping the marker already leaves the
 * text flush. A block whose body carries no marker at all - the ordinary
 * HTML comment - keeps whatever indentation the author used, and that would
 * otherwise be baked into the rewritten block and grow by one level every
 * time the command runs.
 */
// -----------------------------------------------------------------------------
function _Dedent(text: string): string {
  const lines = text.split("\n");
  const widths = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.length - line.trimStart().length);

  if (widths.length === 0) {
    return text;
  }

  const common = Math.min(...widths);
  return common === 0 ? text : lines.map((line) => line.slice(common)).join("\n");
}

// -----------------------------------------------------------------------------
function _ExtractCommentedTextWithoutOriginal(commentedText: string): ResolvedCommentText | null {
  const lastSpace = commentedText.lastIndexOf(" ");
  if (lastSpace > 0) {
    const open = commentedText.slice(0, lastSpace).trimEnd();
    const close = commentedText.slice(lastSpace + 1);

    if (open.length > 0 && close.length > 0) {
      return {
        syntax: CreateBlockCommentSyntax(open, close),
        text: "",
      };
    }
  }

  return {
    syntax: CreateLineLikeCommentSyntax(commentedText),
    text: "",
  };
}
