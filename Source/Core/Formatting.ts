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
// File      : Formatting.ts                                                  //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2026-05-19                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// -------------------------------------------------------------------------- //

/**
 * Building a fancy comment from text, and reading one back out.
 *
 * Every function here is a pure string transform over an explicit
 * CommentSyntax and FormattingConfig: no editor, no cursor, no document.
 * That is what lets the toggle behave symmetrically - Parse is the exact
 * inverse of Build, and a round trip is what a test can assert.
 */

// -----------------------------------------------------------------------------
import { CommentSyntax } from "../../Libraries/Saturno.VSCode.FancyLib/Source/CommentUtils";
export { CommentSyntax };

//
// TYPES
//

// -----------------------------------------------------------------------------
export interface FormattingConfig {
  lineWidth: number;
  separatorChar: string;
  separatorPrefixLength: number;
  separatorBlankLines: number;
}

// -----------------------------------------------------------------------------
export const DEFAULT_CONFIG: FormattingConfig = {
  lineWidth: 80,
  separatorChar: "-",
  separatorPrefixLength: 3,
  separatorBlankLines: 0,
};

const MAX_SEPARATOR_BLANK_LINES = 20;


//
// BUILD FUNCTIONS
//

// -----------------------------------------------------------------------------
export function BuildCommentLine(
  syntax: CommentSyntax,
  text: string,
  config: FormattingConfig = DEFAULT_CONFIG,
  startColumn = 0
): string {
  syntax = _NormalizeSingleLineSyntax(syntax);
  text = text.trim();

  const prefix = syntax.singleLineStart + " " + config.separatorChar.repeat(config.separatorPrefixLength);
  const suffix = syntax.singleLineEnd ? " " + syntax.singleLineEnd : "";
  const textPart = text.length > 0 ? " " + text + " " : "";

  const fixedLength = prefix.length + textPart.length + suffix.length;
  const availableWidth = Math.max(0, config.lineWidth - startColumn);
  const fillLength = Math.max(0, availableWidth - fixedLength);
  const fill = config.separatorChar.repeat(fillLength);

  return prefix + textPart + fill + suffix;
}

// -----------------------------------------------------------------------------
export function BuildCommentBlock(syntax: CommentSyntax, indent: string, text: string): string {
  syntax = _NormalizeMultiLineSyntax(syntax);
  const textLines = text.trim().split(/\r?\n/);
  const lines = [
    indent + syntax.multiLineStart,
    ...textLines.map((line) => indent + syntax.multiLineMiddle + " " + line),
    indent + syntax.multiLineEnd,
  ];

  return lines.join("\n");
}

/**
 * Builds a block for insertion immediately after an already-retained indent.
 * The first line omits that indent because the editor range starts after it;
 * following lines keep the exact whitespace, including tabs and mixed indent.
 */
export function BuildCommentBlockTail(syntax: CommentSyntax, indent: string, text: string): string {
  return BuildCommentBlock(syntax, indent, text).slice(indent.length);
}

/** Builds a fancy block and its separator, with configurable blank lines between them. */
export function BuildCommentBlockWithSeparator(
  syntax: CommentSyntax,
  indent: string,
  text: string,
  config: FormattingConfig = DEFAULT_CONFIG,
  startColumn = 0
): string {
  return `${BuildCommentBlock(syntax, indent, text)}${_SeparatorGap(config)}${indent}${BuildCommentLine(
    syntax,
    "",
    config,
    startColumn
  )}`;
}

/** Like BuildCommentBlockWithSeparator, but leaves the first-line indent to the editor. */
export function BuildCommentBlockTailWithSeparator(
  syntax: CommentSyntax,
  indent: string,
  text: string,
  config: FormattingConfig = DEFAULT_CONFIG,
  startColumn = 0
): string {
  return `${BuildCommentBlockTail(syntax, indent, text)}${_SeparatorGap(config)}${indent}${BuildCommentLine(
    syntax,
    "",
    config,
    startColumn
  )}`;
}

// -----------------------------------------------------------------------------
export function GetIndentColumn(lineText: string, cursorCharacter: number): number {
  if (lineText.trim().length === 0) {
    return cursorCharacter;
  }
  return lineText.length - lineText.trimStart().length;
}

//
// PARSE FUNCTIONS (for toggle/undo)
//

// -----------------------------------------------------------------------------
export function ParseFancyCommentLine(
  line: string,
  syntax: CommentSyntax,
  config: FormattingConfig = DEFAULT_CONFIG
): { text: string } | null {
  syntax = _NormalizeSingleLineSyntax(syntax);
  const trimmed = line.trimStart();

  const prefix = syntax.singleLineStart + " " + config.separatorChar.repeat(config.separatorPrefixLength);
  const suffix = syntax.singleLineEnd ? " " + syntax.singleLineEnd : "";

  if (!trimmed.startsWith(prefix)) {
    return null;
  }

  if (suffix.length > 0 && !trimmed.endsWith(suffix)) {
    return null;
  }

  const body = trimmed.slice(
    prefix.length,
    suffix.length > 0 ? trimmed.length - suffix.length : undefined
  );

  if (body.length === 0) {
    return { text: "" };
  }

  if (_IsAllChar(body, config.separatorChar)) {
    return { text: "" };
  }

  if (!body.startsWith(" ")) {
    return null;
  }

  // Find trailing fill: longest run of separatorChar from the end
  let fillStart = body.length;
  while (fillStart > 0 && body[fillStart - 1] === config.separatorChar) {
    fillStart--;
  }

  if (fillStart === body.length) {
    // No trailing fill (zero-fill case: text exceeded lineWidth)
    // Body should be " text " (space + text + space)
    if (body.length >= 3 && body.endsWith(" ")) {
      return { text: body.slice(1, -1) };
    }
    return null;
  }

  // Normal case: body = " text " + fill
  // The char before the fill run should be a space
  if (body[fillStart - 1] !== " ") {
    return null;
  }

  const text = body.slice(1, fillStart - 1);
  return { text };
}

// -----------------------------------------------------------------------------
export function ParseFancyCommentBlock(
  lines: string[],
  syntax: CommentSyntax,
  config: FormattingConfig = DEFAULT_CONFIG
): { text: string; lineCount: number } | null {
  syntax = _NormalizeMultiLineSyntax(syntax);
  if (lines.length < 3) {
    return null;
  }

  const startTrimmed = lines[0].trimStart();
  if (startTrimmed !== syntax.multiLineStart) {
    return null;
  }
  const indent = lines[0].slice(0, lines[0].length - startTrimmed.length);
  const middlePrefix = indent + syntax.multiLineMiddle;
  const textLines: string[] = [];
  let endLine = -1;

  for (let index = 1; index < lines.length; index++) {
    if (lines[index] === indent + syntax.multiLineEnd) {
      endLine = index;
      break;
    }

    if (!lines[index].startsWith(middlePrefix)) {
      return null;
    }

    const remainder = lines[index].slice(middlePrefix.length);
    textLines.push(remainder.startsWith(" ") ? remainder.slice(1) : remainder);
  }

  if (endLine < 2 || textLines.length === 0) {
    return null;
  }

  const text = textLines.join("\n");
  let separatorLine = endLine + 1;
  let blankLinesBeforeSeparator = 0;
  while (
    separatorLine < lines.length &&
    blankLinesBeforeSeparator < MAX_SEPARATOR_BLANK_LINES &&
    lines[separatorLine].trim().length === 0
  ) {
    separatorLine++;
    blankLinesBeforeSeparator++;
  }

  if (separatorLine < lines.length) {
    const separatorParsed = ParseFancyCommentLine(lines[separatorLine], syntax, config);
    if (separatorParsed !== null && separatorParsed.text === "") {
      return { text, lineCount: separatorLine + 1 };
    }
  }

  return { text, lineCount: endLine + 1 };
}

//
// SEARCH FUNCTIONS (for block-aware toggle)
//

// -----------------------------------------------------------------------------
export function FindFancyCommentBlock(
  lines: string[],
  cursorLine: number,
  syntax: CommentSyntax,
  config: FormattingConfig = DEFAULT_CONFIG
): { text: string; startLine: number; lineCount: number } | null {
  syntax = _NormalizeMultiLineSyntax(syntax);
  // Include the longest supported separator gap when searching back from it.
  const searchStart = Math.max(0, cursorLine - (3 + MAX_SEPARATOR_BLANK_LINES));

  for (let i = cursorLine; i >= searchStart; i--) {
    if (lines[i].trimStart() !== syntax.multiLineStart) {
      continue;
    }

    const blockLines = lines.slice(i);
    const parsed = ParseFancyCommentBlock(blockLines, syntax, config);
    if (parsed === null) {
      continue;
    }

    const blockEnd = i + parsed.lineCount - 1;
    if (cursorLine > blockEnd) {
      continue;
    }

    return { text: parsed.text, startLine: i, lineCount: parsed.lineCount };
  }

  return null;
}

//
// HELPERS
//

// -----------------------------------------------------------------------------
function _IsAllChar(text: string, expectedChar: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== expectedChar) {
      return false;
    }
  }
  return true;
}

// -----------------------------------------------------------------------------
function _SeparatorGap(config: FormattingConfig): string {
  const requested = config.separatorBlankLines;
  const blankLines = Number.isFinite(requested)
    ? Math.max(0, Math.min(MAX_SEPARATOR_BLANK_LINES, Math.floor(requested)))
    : DEFAULT_CONFIG.separatorBlankLines;
  return "\n".repeat(blankLines + 1);
}

// -----------------------------------------------------------------------------
function _NormalizeSingleLineSyntax(syntax: CommentSyntax): CommentSyntax {
  return {
    singleLineStart: syntax.singleLineEnd.length === 0
      ? _NormalizeCommentToken(syntax.singleLineStart)
      : syntax.singleLineStart,
    singleLineEnd: syntax.singleLineEnd,
    multiLineStart: syntax.multiLineStart,
    multiLineMiddle: syntax.multiLineMiddle,
    multiLineEnd: syntax.multiLineEnd,
  };
}

// -----------------------------------------------------------------------------
function _NormalizeMultiLineSyntax(syntax: CommentSyntax): CommentSyntax {
  if (!_ShouldNormalizeLineLikeSyntax(syntax)) {
    return syntax;
  }

  return {
    singleLineStart: syntax.singleLineStart,
    singleLineEnd: syntax.singleLineEnd,
    multiLineStart: _NormalizeCommentToken(syntax.multiLineStart),
    multiLineMiddle: _NormalizeCommentToken(syntax.multiLineMiddle),
    multiLineEnd: _NormalizeCommentToken(syntax.multiLineEnd),
  };
}

// -----------------------------------------------------------------------------
function _NormalizeCommentToken(token: string): string {
  if (token.length !== 1 || token.trim().length !== 1) {
    return token;
  }

  return token.repeat(2);
}

// -----------------------------------------------------------------------------
function _ShouldNormalizeLineLikeSyntax(syntax: CommentSyntax): boolean {
  if (syntax.singleLineEnd.length !== 0) {
    return false;
  }

  return (
    syntax.singleLineStart === syntax.multiLineStart &&
    syntax.singleLineStart === syntax.multiLineMiddle &&
    syntax.singleLineStart === syntax.multiLineEnd
  );
}
