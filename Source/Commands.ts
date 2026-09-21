// -------------------------------------------------------------------------- //
//                               *       +                                    //
//                         '                  |                               //
//                     ()    .-.,="``"=.    - o -                             //
//                           '=/_       \     |                              //
//                        *   |  '=._    |                                    //
//                             \     `=./`,        '                         //
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
// SPDX-License-Identifier: GPL-3.0-only

/**
 * The two commands the extension contributes, and the editor work they do.
 *
 * This is the adapter layer: it reads the editor state, calls the pure core
 * in Commenting.ts and Formatting.ts, and applies the edit. Extension.ts only
 * registers these; nothing here knows about activation.
 */

// -----------------------------------------------------------------------------
import * as vscode from "vscode";
// -----------------------------------------------------------------------------
import * as Fancy from "../Libraries/Saturno.VSCode.FancyLib/Source";
import { APP_NAME } from "./Constants";
import { ExtensionConfig } from "./Config";
import { GetConfig } from "./ConfigResolution";
import {
  ExtractCommentedText,
  FindFancyCommentBlockUsingKnownSyntaxFirst,
  InferFancyCommentLineSyntax,
  ShouldUseVSCodeBlockComment,
} from "./Commenting";
import {
  BuildCommentBlock,
  BuildCommentLine,
  FormattingConfig,
  GetIndentColumn,
  ParseFancyCommentLine,
} from "./Formatting";

//
// COMMANDS
//

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

  const lines = [...new Set(editor.selections.map((selection) => selection.start.line))].sort((a, b) => a - b);
  const replacements = lines.map((line) => {
    const lineText = editor.document.lineAt(line).text;
    const column = lineText.length - lineText.trimStart().length;
    const parsed = ParseFancyCommentLine(
      lineText,
      InferFancyCommentLineSyntax(lineText, config) ?? syntax, config
    );

    return {
      line,
      column,
      lineText,
      value: parsed?.text ?? BuildCommentLine(syntax, lineText.trim(), config, column),
    };
  });

  await editor.edit((editBuilder) => {
    for (const replacement of replacements) {
      editBuilder.replace(new vscode.Range(replacement.line, replacement.column, replacement.line, replacement.lineText.length), replacement.value);
    }
  });
}

// -----------------------------------------------------------------------------
async function _ExecuteMultiCursorMultiLine(editor: vscode.TextEditor, config: ExtensionConfig): Promise<void> {
  const syntax = Fancy.CommentDetection.GetCommentSyntaxForEditor(editor);
  if (!syntax) {
    Fancy.EditorUtils.ShowError(APP_NAME, `unsupported language "${editor.document.languageId}"`);
    return;
  }
  if (editor.selections.some((selection) => !selection.isEmpty && selection.start.line !== selection.end.line)) {
    Fancy.EditorUtils.ShowError(APP_NAME, "use one cursor for a multi-line selection.");
    return;
  }

  const documentLines = Array.from({ length: editor.document.lineCount }, (_, line) => editor.document.lineAt(line).text);
  const plannedRanges = new Set<string>();
  const replacements: Array<{ range: vscode.Range; value: string }> = [];
  for (const line of [...new Set(editor.selections.map((selection) => selection.start.line))].sort((a, b) => a - b)) {
    const lineText = editor.document.lineAt(line).text;
    const column = GetIndentColumn(lineText, 0);
    const found = FindFancyCommentBlockUsingKnownSyntaxFirst(documentLines, line, syntax, config);
    if (found) {
      const start = found.startLine;
      const end = start + found.lineCount - 1;
      const key = `${start}:${end}`;
      if (plannedRanges.has(key)) {
        continue;
      }
      plannedRanges.add(key);
      const indent = documentLines[start].match(/^\s*/)?.[0] ?? "";
      replacements.push({
        range: new vscode.Range(start, 0, end, documentLines[end].length),
        value: indent + found.text,
      });
      continue;
    }

    const indent = lineText.match(/^\s*/)?.[0] ?? "";
    const block = BuildCommentBlock(syntax, indent, lineText.trim());
    const separator = indent + BuildCommentLine(syntax, "", config, indent.length);
    replacements.push({
      range: new vscode.Range(line, column, line, lineText.length),
      value: `${block}\n${separator}`,
    });
  }

  await editor.edit((editBuilder) => {
    for (const replacement of replacements) {
      editBuilder.replace(replacement.range, replacement.value);
    }
  });
}

// -----------------------------------------------------------------------------
export async function ExecuteSingleLineComment(): Promise<void> {
  const editor = Fancy.EditorUtils.GetActiveEditor();
  if (!editor) {
    Fancy.EditorUtils.ShowError(APP_NAME, "no active editor");
    return;
  }
  if (editor.selections.length > 1) {
    await _ExecuteMultiCursorSingleLine(editor, GetConfig());
    return;
  }

  const config = GetConfig();
  const line = editor.selection.start.line;
  const lineText = editor.document.lineAt(line).text;
  const column = GetIndentColumn(lineText, editor.selection.start.character);

  const resolvedSyntax = Fancy.CommentDetection.GetCommentSyntaxForEditor(editor);
  const existingSyntax = InferFancyCommentLineSyntax(lineText, config) ?? resolvedSyntax;
  if (existingSyntax) {
    const parsed = ParseFancyCommentLine(lineText, existingSyntax, config);
    if (parsed !== null) {
      await editor.edit((editBuilder) => {
        const range = new vscode.Range(line, column, line, lineText.length);
        editBuilder.replace(range, parsed.text);
      });
      return;
    }
  }

  if (config.commentImplementation === "vscode") {
    const applied = await _ApplyFancySingleLineCommentViaVSCode(editor, line, column, lineText, config);
    if (applied) {
      return;
    }
  }

  if (!resolvedSyntax) {
    Fancy.EditorUtils.ShowError(APP_NAME, `unsupported language "${editor.document.languageId}"`);
    return;
  }

  const text = lineText.trim();
  const commentLine = BuildCommentLine(resolvedSyntax, text, config, column);

  await editor.edit((editBuilder) => {
    const range = new vscode.Range(line, column, line, lineText.length);
    editBuilder.replace(range, commentLine);
  });
}

// -----------------------------------------------------------------------------
export async function ExecuteMultiLineComment(): Promise<void> {
  const editor = Fancy.EditorUtils.GetActiveEditor();
  if (!editor) {
    Fancy.EditorUtils.ShowError(APP_NAME, "no active editor");
    return;
  }
  if (editor.selections.length > 1) {
    await _ExecuteMultiCursorMultiLine(editor, GetConfig());
    return;
  }

  const config = GetConfig();
  const line = editor.selection.start.line;
  const lineText = editor.document.lineAt(line).text;
  const column = GetIndentColumn(lineText, editor.selection.start.character);
  const resolvedSyntax = Fancy.CommentDetection.GetCommentSyntaxForEditor(editor);
  const doc = editor.document;

  const windowStart = 0;
  const windowEnd = doc.lineCount;
  const windowLines: string[] = [];
  for (let i = windowStart; i < windowEnd; i++) {
    windowLines.push(doc.lineAt(i).text);
  }

  const found = FindFancyCommentBlockUsingKnownSyntaxFirst(
    windowLines,
    line - windowStart,
    resolvedSyntax,
    config
  );

  if (found !== null) {
    const blockStartLine = windowStart + found.startLine;
    const lastLine = blockStartLine + found.lineCount - 1;
    const lastLineLength = doc.lineAt(lastLine).text.length;
    const blockIndent = doc.lineAt(blockStartLine).text.length - doc.lineAt(blockStartLine).text.trimStart().length;
    await editor.edit((editBuilder) => {
      const range = new vscode.Range(blockStartLine, 0, lastLine, lastLineLength);
      editBuilder.replace(range, " ".repeat(blockIndent) + found.text);
    });
    return;
  }

  if (ShouldUseVSCodeBlockComment(config.commentImplementation, editor.selection.isEmpty, resolvedSyntax)) {
    const applied = await _ApplyFancyMultiLineCommentViaVSCode(editor, line, column, lineText, config);
    if (applied) {
      return;
    }
  }

  if (!resolvedSyntax) {
    Fancy.EditorUtils.ShowError(APP_NAME, `unsupported language "${editor.document.languageId}"`);
    return;
  }

  const text = editor.selection.isEmpty ? lineText.trim() : doc.getText(editor.selection).trim();
  const indent = lineText.match(/^\s*/)?.[0] ?? "";
  const replacementRange = editor.selection.isEmpty
    ? new vscode.Range(line, column, line, lineText.length)
    : editor.selection;

  const commentBlock = BuildCommentBlock(resolvedSyntax, indent, text);
  const commentLine = BuildCommentLine(resolvedSyntax, "", config, column);

  const fullComment = `${commentBlock}\n${indent}${commentLine}`;

  await editor
    .edit((editBuilder) => {
      editBuilder.replace(replacementRange, fullComment);
    })
    .then(() => {
      const newLine = line + 1;
      const newColumn = column + resolvedSyntax.multiLineMiddle.length + 1;
      const pos = new vscode.Position(newLine, newColumn);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Selection(pos, pos));
    });
}

// -----------------------------------------------------------------------------
async function _ApplyFancySingleLineCommentViaVSCode(
  editor: vscode.TextEditor,
  line: number,
  column: number,
  lineText: string,
  config: FormattingConfig
): Promise<boolean> {
  const originalSelection = editor.selection;
  const originalLineText = lineText;

  editor.selection = new vscode.Selection(line, column, line, lineText.length);
  await vscode.commands.executeCommand("editor.action.commentLine");

  const commentedLine = editor.document.lineAt(line).text;
  const extracted = ExtractCommentedText(commentedLine.slice(column), originalLineText.slice(column));

  if (!extracted) {
    await _RestoreLine(editor, line, originalLineText, originalSelection);
    return false;
  }

  await vscode.commands.executeCommand("undo");

  const commentLine = BuildCommentLine(extracted.syntax, extracted.text, config, column);

  await editor.edit((editBuilder) => {
    editBuilder.replace(
      new vscode.Range(line, column, line, editor.document.lineAt(line).text.length),
      commentLine
    );
  }, { undoStopBefore: false, undoStopAfter: true });

  editor.selection = originalSelection;
  return true;
}

// -----------------------------------------------------------------------------
async function _ApplyFancyMultiLineCommentViaVSCode(
  editor: vscode.TextEditor,
  line: number,
  column: number,
  lineText: string,
  config: FormattingConfig
): Promise<boolean> {
  const originalSelection = editor.selection;
  const originalLineText = lineText;
  const selection = new vscode.Selection(line, column, line, lineText.length);

  editor.selection = selection;
  await vscode.commands.executeCommand("editor.action.blockComment");

  const commentedLine = editor.document.lineAt(line).text;
  const extracted = ExtractCommentedText(commentedLine.slice(column), originalLineText.slice(column));

  if (!extracted || extracted.syntax.singleLineEnd.length === 0) {
    await _RestoreLine(editor, line, originalLineText, originalSelection);
    return false;
  }

  await vscode.commands.executeCommand("undo");

  const text = extracted.text;
  const indent = " ".repeat(column);
  const commentBlock = BuildCommentBlock(extracted.syntax, indent, text);
  const commentLine = BuildCommentLine(extracted.syntax, "", config, column);
  const fullComment = `${commentBlock}\n${indent}${commentLine}`;

  await editor.edit((editBuilder) => {
    editBuilder.replace(
      new vscode.Range(line, column, line, editor.document.lineAt(line).text.length),
      fullComment
    );
  }, { undoStopBefore: false, undoStopAfter: true });

  const newLine = line + 1;
  const newColumn = column + extracted.syntax.multiLineMiddle.length + 1;
  const pos = new vscode.Position(newLine, newColumn);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Selection(pos, pos));
  return true;
}

// -----------------------------------------------------------------------------
async function _RestoreLine(
  editor: vscode.TextEditor,
  line: number,
  originalLineText: string,
  originalSelection: vscode.Selection
): Promise<void> {
  await editor.edit((editBuilder) => {
    editBuilder.replace(
      new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length),
      originalLineText
    );
  });

  editor.selection = originalSelection;
}

