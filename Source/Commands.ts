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
// File      : Commands.ts                                                    //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2026-09-21                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// License   : GPLv3                                                          //
// -------------------------------------------------------------------------- //

/**
 * The command bodies: the adapter between the editor and Core/.
 *
 * Everything vscode-shaped happens here - reading the selection, running a
 * built-in command, applying the edit - and every decision about what the
 * text should become happens in Core/. Extension.ts only registers these.
 */

// -----------------------------------------------------------------------------
import * as vscode from "vscode";
// -----------------------------------------------------------------------------
import * as Fancy from "../Libraries/Saturno.VSCode.FancyLib/Source";
import { AboutSpec } from "../Libraries/Saturno.VSCode.FancyLib/Source/AboutPage/AboutModel";
// -----------------------------------------------------------------------------
import { APP_NAME } from "./Constants";
import { GetConfig } from "./ConfigResolution";
import { ExtensionConfig } from "./Core/Config";
import {
  ExtractCommentedText,
  FindFancyCommentBlockUsingKnownSyntaxFirst,
  FindNativeCommentBlock,
  InferFancyCommentLineSyntax,
  ShouldUseVSCodeBlockComment,
} from "./Core/Commenting";
import {
  BuildCommentBlockWithSeparator,
  BuildCommentBlockTailWithSeparator,
  BuildCommentLine,
  FormattingConfig,
  GetIndentColumn,
  ParseFancyCommentLine,
} from "./Core/Formatting";

//
// COMMANDS
//

// -----------------------------------------------------------------------------
export async function ExecuteAbout(
  context: vscode.ExtensionContext,
  spec: AboutSpec
): Promise<void> {
  await Fancy.AboutPage.ShowAboutPanel(context, spec);
}

// -----------------------------------------------------------------------------
export async function ExecuteSingleLineComment(): Promise<void> {
  const editor = Fancy.EditorUtils.GetActiveEditor();
  if (!editor) {
    Fancy.EditorUtils.ShowError(APP_NAME, "no active editor");
    return;
  }

  const config = GetConfig();
  if (editor.selections.length > 1) {
    await _ExecuteMultiCursorSingleLine(editor, config);
    return;
  }

  const line = editor.selection.start.line;
  const line_text = editor.document.lineAt(line).text;
  const column = GetIndentColumn(line_text, editor.selection.start.character);
  const resolved_syntax = Fancy.CommentDetection.GetCommentSyntaxForEditor(editor);

  // Uncommenting comes first: a line that is already fancy toggles back to
  // plain text whatever the configured implementation is.
  const existing_syntax = InferFancyCommentLineSyntax(line_text, config) ?? resolved_syntax;
  if (existing_syntax) {
    const parsed = ParseFancyCommentLine(line_text, existing_syntax, config);
    if (parsed !== null) {
      await _ReplaceLineTail(editor, line, column, parsed.text);
      return;
    }
  }

  if (config.commentImplementation === "vscode") {
    if (await _ApplySingleLineViaVSCode(editor, line, column, line_text, config)) {
      return;
    }
  }

  if (!resolved_syntax) {
    Fancy.EditorUtils.ShowError(APP_NAME, `unsupported language "${editor.document.languageId}"`);
    return;
  }

  await _ReplaceLineTail(
    editor,
    line,
    column,
    BuildCommentLine(resolved_syntax, line_text.trim(), config, column)
  );
}

// -----------------------------------------------------------------------------
export async function ExecuteMultiLineComment(): Promise<void> {
  const editor = Fancy.EditorUtils.GetActiveEditor();
  if (!editor) {
    Fancy.EditorUtils.ShowError(APP_NAME, "no active editor");
    return;
  }

  const config = GetConfig();
  if (editor.selections.length > 1) {
    await _ExecuteMultiCursorMultiLine(editor, config);
    return;
  }

  const doc = editor.document;
  const line = editor.selection.start.line;
  const line_text = doc.lineAt(line).text;
  const column = GetIndentColumn(line_text, editor.selection.start.character);
  const resolved_syntax = Fancy.CommentDetection.GetCommentSyntaxForEditor(editor);

  const found = FindFancyCommentBlockUsingKnownSyntaxFirst(
    _ReadAllLines(doc),
    line,
    resolved_syntax,
    config
  );

  if (found !== null) {
    const last_line = found.startLine + found.lineCount - 1;
    const indent = _GetIndent(doc.lineAt(found.startLine).text);
    await editor.edit((builder) => {
      builder.replace(
        new vscode.Range(found.startLine, 0, last_line, doc.lineAt(last_line).text.length),
        indent + found.text
      );
    });
    return;
  }

  // The caret may be sitting inside the language's own block comment. That
  // block is what the user sees and means, so it is rewritten whole rather
  // than having a new comment injected into the middle of it.
  if (editor.selection.isEmpty) {
    const native = FindNativeCommentBlock(_ReadAllLines(doc), line, config);
    if (native !== null) {
      await _RewriteNativeBlock(editor, native, resolved_syntax, config);
      return;
    }
  }

  if (config.preferSingleLineComments) {
    const line_syntax =
      resolved_syntax?.singleLineEnd === ""
        ? resolved_syntax
        : await _ProbeSingleLineCommentSyntax(editor, line, column, line_text);
    if (line_syntax) {
      const selection_is_empty = editor.selection.isEmpty;
      const text = selection_is_empty ? line_text.trim() : doc.getText(editor.selection).trim();
      const indent = line_text.slice(0, column);
      const range = selection_is_empty
        ? new vscode.Range(line, column, line, line_text.length)
        : editor.selection;
      const replacement = selection_is_empty
        ? _BuildBlockTailWithSeparator(line_syntax, indent, text, config, column)
        : _BuildBlockWithSeparator(line_syntax, _GetIndent(line_text), text, config, column);

      await editor.edit((builder) => builder.replace(range, replacement));
      if (selection_is_empty) {
        _PlaceCursorInBlockBody(editor, line, column, line_syntax.multiLineMiddle.length);
      }
      return;
    }
  }

  if (ShouldUseVSCodeBlockComment(config.commentImplementation, editor.selection.isEmpty, resolved_syntax)) {
    if (await _ApplyMultiLineViaVSCode(editor, line, column, line_text, config)) {
      return;
    }
  }

  if (!resolved_syntax) {
    Fancy.EditorUtils.ShowError(APP_NAME, `unsupported language "${editor.document.languageId}"`);
    return;
  }

  const text = editor.selection.isEmpty ? line_text.trim() : doc.getText(editor.selection).trim();
  const indent = line_text.slice(0, column);
  const range = editor.selection.isEmpty
    ? new vscode.Range(line, column, line, line_text.length)
    : editor.selection;
  const replacement = editor.selection.isEmpty
    ? _BuildBlockTailWithSeparator(resolved_syntax, indent, text, config, column)
    : _BuildBlockWithSeparator(resolved_syntax, _GetIndent(line_text), text, config, column);

  await editor.edit((builder) => {
    builder.replace(range, replacement);
  });

  _PlaceCursorInBlockBody(editor, line, column, resolved_syntax.multiLineMiddle.length);
}

//
// MULTI CURSOR
//

/**
 * One cursor per line, each toggled independently. All the replacements are
 * computed against the document as it was, then applied in a single edit -
 * computing them one at a time would read line text that an earlier
 * replacement had already shifted.
 */
// -----------------------------------------------------------------------------
async function _ExecuteMultiCursorSingleLine(
  editor: vscode.TextEditor,
  config: ExtensionConfig
): Promise<void> {
  const syntax = Fancy.CommentDetection.GetCommentSyntaxForEditor(editor);
  if (!syntax) {
    Fancy.EditorUtils.ShowError(APP_NAME, `unsupported language "${editor.document.languageId}"`);
    return;
  }

  const replacements = _SelectedLines(editor).map((line) => {
    const line_text = editor.document.lineAt(line).text;
    const column = _GetIndent(line_text).length;
    const parsed = ParseFancyCommentLine(
      line_text,
      InferFancyCommentLineSyntax(line_text, config) ?? syntax,
      config
    );

    return {
      range: new vscode.Range(line, column, line, line_text.length),
      value: parsed?.text ?? BuildCommentLine(syntax, line_text.trim(), config, column),
    };
  });

  await _ApplyAll(editor, replacements);
}

// -----------------------------------------------------------------------------
async function _ExecuteMultiCursorMultiLine(
  editor: vscode.TextEditor,
  config: ExtensionConfig
): Promise<void> {
  const syntax = Fancy.CommentDetection.GetCommentSyntaxForEditor(editor);
  if (!syntax) {
    Fancy.EditorUtils.ShowError(APP_NAME, `unsupported language "${editor.document.languageId}"`);
    return;
  }

  if (editor.selections.some((s) => !s.isEmpty && s.start.line !== s.end.line)) {
    Fancy.EditorUtils.ShowError(APP_NAME, "use one cursor for a multi-line selection.");
    return;
  }

  const document_lines = _ReadAllLines(editor.document);
  const planned_blocks = new Set<string>();
  const replacements: Array<{ range: vscode.Range; value: string }> = [];

  for (const line of _SelectedLines(editor)) {
    const line_text = document_lines[line];
    const column = GetIndentColumn(line_text, 0);
    const found = FindFancyCommentBlockUsingKnownSyntaxFirst(document_lines, line, syntax, config);

    if (found) {
      // Two cursors inside the same block would otherwise produce two
      // overlapping replacements, which vscode rejects as a whole edit.
      const end = found.startLine + found.lineCount - 1;
      const key = `${found.startLine}:${end}`;
      if (planned_blocks.has(key)) {
        continue;
      }
      planned_blocks.add(key);

      replacements.push({
        range: new vscode.Range(found.startLine, 0, end, document_lines[end].length),
        value: _GetIndent(document_lines[found.startLine]) + found.text,
      });
      continue;
    }

    const indent = line_text.slice(0, column);
    replacements.push({
      range: new vscode.Range(line, column, line, line_text.length),
      value: _BuildBlockTailWithSeparator(
        syntax,
        indent,
        line_text.trim(),
        config,
        column
      ),
    });
  }

  await _ApplyAll(editor, replacements);
}

//
// VS CODE COMMENT COMMANDS
//

/**
 * Borrows VS Code's own `editor.action.commentLine` to learn the comment
 * tokens for the current language, then undoes it and writes the fancy line
 * instead.
 *
 * This exists because VS Code knows about languages this extension has no
 * table for - including ones contributed by other extensions. The undo is
 * paired with `undoStopBefore: false` on the following edit, so the user
 * sees one undo step, not three.
 *
 * Returns false when the tokens could not be recovered, leaving the line
 * exactly as it was found so the caller can fall back to its own resolver.
 */
// -----------------------------------------------------------------------------
async function _ApplySingleLineViaVSCode(
  editor: vscode.TextEditor,
  line: number,
  column: number,
  originalLineText: string,
  config: FormattingConfig
): Promise<boolean> {
  const original_selection = editor.selection;

  editor.selection = new vscode.Selection(line, column, line, originalLineText.length);
  await vscode.commands.executeCommand("editor.action.commentLine");

  const extracted = ExtractCommentedText(
    editor.document.lineAt(line).text.slice(column),
    originalLineText.slice(column)
  );

  if (!extracted) {
    await _RestoreLine(editor, line, originalLineText, original_selection);
    return false;
  }

  await vscode.commands.executeCommand("undo");
  await _ReplaceLineTail(
    editor,
    line,
    column,
    BuildCommentLine(extracted.syntax, extracted.text, config, column),
    { undoStopBefore: false, undoStopAfter: true }
  );

  editor.selection = original_selection;
  return true;
}

/**
 * The block-comment counterpart of _ApplySingleLineViaVSCode. A language
 * whose block syntax has no closing token (`extracted.syntax.singleLineEnd`
 * empty) cannot produce a block, so it falls back rather than emitting a
 * malformed one.
 */
// -----------------------------------------------------------------------------
async function _ApplyMultiLineViaVSCode(
  editor: vscode.TextEditor,
  line: number,
  column: number,
  originalLineText: string,
  config: FormattingConfig
): Promise<boolean> {
  const original_selection = editor.selection;

  editor.selection = new vscode.Selection(line, column, line, originalLineText.length);
  await vscode.commands.executeCommand("editor.action.blockComment");

  const extracted = ExtractCommentedText(
    editor.document.lineAt(line).text.slice(column),
    originalLineText.slice(column)
  );

  if (!extracted || extracted.syntax.singleLineEnd.length === 0) {
    await _RestoreLine(editor, line, originalLineText, original_selection);
    return false;
  }

  await vscode.commands.executeCommand("undo");
  const indent = originalLineText.slice(0, column);
  await _ReplaceLineTail(
    editor,
    line,
    column,
    _BuildBlockTailWithSeparator(extracted.syntax, indent, extracted.text, config, column),
    { undoStopBefore: false, undoStopAfter: true }
  );

  _PlaceCursorInBlockBody(editor, line, column, extracted.syntax.multiLineMiddle.length);
  return true;
}

/**
 * Ask VS Code to line-comment one line, then undo that probe and keep only
 * the language's line-comment syntax. This covers languages whose comments
 * are available to the editor command but not discoverable from an extension
 * language-configuration contribution.
 */
// -----------------------------------------------------------------------------
async function _ProbeSingleLineCommentSyntax(
  editor: vscode.TextEditor,
  line: number,
  column: number,
  originalLineText: string
): Promise<Fancy.CommentUtils.CommentSyntax | null> {
  const original_selection = editor.selection;
  const original_version = editor.document.version;

  editor.selection = new vscode.Selection(line, column, line, originalLineText.length);
  await vscode.commands.executeCommand("editor.action.commentLine");

  if (editor.document.version === original_version) {
    editor.selection = original_selection;
    return null;
  }

  const extracted = ExtractCommentedText(
    editor.document.lineAt(line).text.slice(column),
    originalLineText.slice(column)
  );

  await vscode.commands.executeCommand("undo");
  if (editor.document.lineAt(line).text !== originalLineText) {
    await _RestoreLine(editor, line, originalLineText, original_selection);
  } else {
    editor.selection = original_selection;
  }

  return extracted?.syntax.singleLineEnd === "" ? extracted.syntax : null;
}

//
// EDITOR HELPERS
//

// -----------------------------------------------------------------------------
function _ReadAllLines(document: vscode.TextDocument): string[] {
  return Array.from({ length: document.lineCount }, (_, line) => document.lineAt(line).text);
}

/** The distinct lines the cursors sit on, in document order. */
// -----------------------------------------------------------------------------
function _SelectedLines(editor: vscode.TextEditor): number[] {
  return [...new Set(editor.selections.map((selection) => selection.start.line))].sort((a, b) => a - b);
}

// -----------------------------------------------------------------------------
function _GetIndent(lineText: string): string {
  return lineText.match(/^\s*/)?.[0] ?? "";
}

/** A fancy block is the block itself plus the separator line under it. */
// -----------------------------------------------------------------------------
function _BuildBlockWithSeparator(
  syntax: Fancy.CommentUtils.CommentSyntax,
  indent: string,
  text: string,
  config: FormattingConfig,
  column: number
): string {
  return BuildCommentBlockWithSeparator(syntax, indent, text, config, column);
}

// The editor range retains `indent` before its start, so only newly created
// lines receive it; duplicating it on the first replacement line shifts the
// opener and breaks tab/mixed indentation alignment.
// -----------------------------------------------------------------------------
function _BuildBlockTailWithSeparator(
  syntax: Fancy.CommentUtils.CommentSyntax,
  indent: string,
  text: string,
  config: FormattingConfig,
  column: number
): string {
  return BuildCommentBlockTailWithSeparator(syntax, indent, text, config, column);
}

/**
 * Replaces a native comment block with the fancy block carrying the same
 * content.
 *
 * Which delimiters the rewrite uses is the user's call:
 * `nativeBlockDelimiters` defaults to keeping the block's own, so a C-style
 * block in a TypeScript file stays a block comment instead of turning into a
 * run of line comments.
 */
// -----------------------------------------------------------------------------
async function _RewriteNativeBlock(
  editor: vscode.TextEditor,
  block: { syntax: Fancy.CommentUtils.CommentSyntax; text: string; startLine: number; lineCount: number },
  languageSyntax: Fancy.CommentUtils.CommentSyntax | null,
  config: ExtensionConfig
): Promise<void> {
  const last_line = block.startLine + block.lineCount - 1;
  const indent = _GetIndent(editor.document.lineAt(block.startLine).text);
  const syntax =
    config.nativeBlockDelimiters === "languageDefault" && languageSyntax
      ? languageSyntax
      : block.syntax;

  await editor.edit((builder) => {
    builder.replace(
      new vscode.Range(block.startLine, 0, last_line, editor.document.lineAt(last_line).text.length),
      _BuildBlockWithSeparator(syntax, indent, block.text, config, indent.length)
    );
  });
}

// -----------------------------------------------------------------------------
async function _ReplaceLineTail(
  editor: vscode.TextEditor,
  line: number,
  column: number,
  value: string,
  options?: { undoStopBefore: boolean; undoStopAfter: boolean }
): Promise<void> {
  await editor.edit((builder) => {
    builder.replace(
      new vscode.Range(line, column, line, editor.document.lineAt(line).text.length),
      value
    );
  }, options);
}

// -----------------------------------------------------------------------------
async function _ApplyAll(
  editor: vscode.TextEditor,
  replacements: Array<{ range: vscode.Range; value: string }>
): Promise<void> {
  await editor.edit((builder) => {
    for (const replacement of replacements) {
      builder.replace(replacement.range, replacement.value);
    }
  });
}

/** Leaves the cursor on the block's body line, just after the marker. */
// -----------------------------------------------------------------------------
function _PlaceCursorInBlockBody(
  editor: vscode.TextEditor,
  line: number,
  column: number,
  markerLength: number
): void {
  const position = new vscode.Position(line + 1, column + markerLength + 1);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Selection(position, position));
}

// -----------------------------------------------------------------------------
async function _RestoreLine(
  editor: vscode.TextEditor,
  line: number,
  originalLineText: string,
  originalSelection: vscode.Selection
): Promise<void> {
  await editor.edit((builder) => {
    builder.replace(
      new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length),
      originalLineText
    );
  });

  editor.selection = originalSelection;
}
