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
// File      : commenting.ts                                                  //
// Project   : vscode-fancy-comments                                          //
// Date      : 2026-08-27                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// -------------------------------------------------------------------------- //
// SPDX-License-Identifier: GPL-3.0-only

// !BUG: FANCYCMNT-B0001
import { CommentSyntax } from "../libs/Saturno.VSCodeKit/src/Types";
import {
  DEFAULT_CONFIG,
  findFancyCommentBlock,
  FormattingConfig,
  parseFancyCommentBlock,
  parseFancyCommentLine,
} from "./formatting";

// !BUG: FANCYCMNT-B0001
export type CommentImplementation = "syntax" | "vscode";

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
export function normalizeCommentImplementation(value: string | undefined): CommentImplementation {
  return value === "syntax" ? "syntax" : "vscode";
}

// -----------------------------------------------------------------------------
export function createLineLikeCommentSyntax(token: string): CommentSyntax {
  return {
    singleLineStart: token,
    singleLineEnd: "",
    multiLineStart: token,
    multiLineMiddle: token,
    multiLineEnd: token,
  };
}

// -----------------------------------------------------------------------------
export function createBlockCommentSyntax(open: string, close: string): CommentSyntax {
  return {
    singleLineStart: open,
    singleLineEnd: close,
    multiLineStart: open,
    multiLineMiddle: open[open.length - 1] ?? open,
    multiLineEnd: close,
  };
}

// -----------------------------------------------------------------------------
export function extractCommentedText(commentedText: string, originalText: string): ResolvedCommentText | null {
  const commented = commentedText.trim();
  const original = originalText.trim();

  if (commented.length === 0) {
    return null;
  }

  if (original.length === 0) {
    return extractCommentedTextWithoutOriginal(commented);
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
      ? createLineLikeCommentSyntax(prefix)
      : createBlockCommentSyntax(prefix, suffix),
    text: original,
  };
}

// -----------------------------------------------------------------------------
export function inferFancyCommentLineSyntax(
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
  const lineSyntax = createLineLikeCommentSyntax(startToken);
  if (parseFancyCommentLine(line, lineSyntax, config) !== null) {
    return lineSyntax;
  }

  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= prefixIndex) {
    return null;
  }

  const endToken = trimmed.slice(lastSpace + 1);
  const blockSyntax = createBlockCommentSyntax(startToken, endToken);

  return parseFancyCommentLine(line, blockSyntax, config) !== null ? blockSyntax : null;
}

// -----------------------------------------------------------------------------
export function inferFancyCommentBlockSyntax(
  lines: string[],
  config: FormattingConfig = DEFAULT_CONFIG
): CommentSyntax | null {
  if (lines.length < 3) {
    return null;
  }

  const startToken = lines[0].trimStart();
  const indent = lines[0].slice(0, lines[0].length - startToken.length);
  if (startToken.length === 0) {
    return null;
  }

  // Explicitly support generated C/JS-style blocks even when the middle marker
  // has no separating space (for example, `*Title`). The start/end pair keeps
  // this narrow and prevents arbitrary prose from being inferred as a block.
  if (startToken === "/*" || startToken === "{/*") {
    const endToken = startToken === "{/*" ? "*/}" : "*/";
    const endIndex = lines.findIndex((line, index) => index >= 2 && line === indent + endToken);
    const syntax: CommentSyntax = {
      singleLineStart: startToken,
      singleLineEnd: endToken,
      multiLineStart: startToken,
      multiLineMiddle: "*",
      multiLineEnd: endToken,
    };
    if (endIndex >= 2 && parseFancyCommentBlock(lines, syntax, config) !== null) {
      return syntax;
    }
    return null;
  }

  // Generated line-like blocks repeat the same marker on the opening, body,
  // and closing lines. This accepts `##Title` as well as `## Title`.
  const lineLikeSyntax = createLineLikeCommentSyntax(startToken);
  if (lines[1].startsWith(indent + startToken)) {
    const endIndex = lines.findIndex((line, index) => index >= 2 && line === indent + startToken);
    if (endIndex >= 2 && parseFancyCommentBlock(lines, lineLikeSyntax, config) !== null) {
      return lineLikeSyntax;
    }
  }

  // Fallback for block syntaxes whose middle marker is separated from content.
  const endToken = lines[2].trimStart();
  const middleRemainder = lines[1].slice(indent.length);
  const middleSpace = middleRemainder.indexOf(" ");
  if (!endToken || middleSpace <= 0) {
    return null;
  }

  const middleToken = middleRemainder.slice(0, middleSpace);
  const syntax: CommentSyntax = {
    singleLineStart: startToken,
    singleLineEnd: endToken,
    multiLineStart: startToken,
    multiLineMiddle: middleToken,
    multiLineEnd: endToken,
  };
  return parseFancyCommentBlock(lines, syntax, config) !== null ? syntax : null;
}

// -----------------------------------------------------------------------------
export function findFancyCommentBlockWithInferredSyntax(
  lines: string[],
  cursorLine: number,
  config: FormattingConfig = DEFAULT_CONFIG
): FoundFancyCommentBlock | null {
  const searchStart = 0;

  for (let i = cursorLine; i >= searchStart; i--) {
    const syntax = inferFancyCommentBlockSyntax(lines.slice(i), config);
    if (!syntax) {
      continue;
    }

    const parsed = parseFancyCommentBlock(lines.slice(i), syntax, config);
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
export function findFancyCommentBlockUsingKnownSyntaxFirst(
  lines: string[],
  cursorLine: number,
  syntax: CommentSyntax | null,
  config: FormattingConfig = DEFAULT_CONFIG
): FoundFancyCommentBlock | null {
  if (syntax) {
    const found = findFancyCommentBlock(lines, cursorLine, syntax, config);
    if (found !== null) {
      return { syntax, ...found };
    }
  }

  return findFancyCommentBlockWithInferredSyntax(lines, cursorLine, config);
}

// -----------------------------------------------------------------------------
function extractCommentedTextWithoutOriginal(commentedText: string): ResolvedCommentText | null {
  const lastSpace = commentedText.lastIndexOf(" ");
  if (lastSpace > 0) {
    const open = commentedText.slice(0, lastSpace).trimEnd();
    const close = commentedText.slice(lastSpace + 1);

    if (open.length > 0 && close.length > 0) {
      return {
        syntax: createBlockCommentSyntax(open, close),
        text: "",
      };
    }
  }

  return {
    syntax: createLineLikeCommentSyntax(commentedText),
    text: "",
  };
}
