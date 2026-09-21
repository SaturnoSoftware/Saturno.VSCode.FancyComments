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
// File      : extension.ts                                                   //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2024-05-03                                                     //
// Copyright : Saturno Software - 2024 - 2026                                 //
// Author    : mateusdigital <hello@mateus.digital>                           //
// -------------------------------------------------------------------------- //

// -----------------------------------------------------------------------------
import * as vscode from "vscode";
// One FancyLib import for the whole adapter layer, matching FancyHeader.
// Known accepted gap (VSCODEKIT-0026): the barrel also re-exports the dev-only
// Open Bug domain, so it compiles into a production build too. Decided by
// Mateus on 2026-09-21 in favour of one import shape across the family; the
// isolation assertion in tests/productionBuildIsolation.test.ts is disabled
// with the same note FancyHeader carries, and the gap is tracked, not silent.
// The pure core (commenting.ts, formatting.ts) keeps importing its one FancyLib
// module directly, so it never reaches vscode through this barrel.
import * as Fancy from "../Libraries/Saturno.VSCode.FancyLib/Source";
import {
  extractCommentedText,
  findFancyCommentBlockUsingKnownSyntaxFirst,
  inferFancyCommentLineSyntax,
  normalizeCommentImplementation,
  shouldUseVSCodeBlockComment,
} from "./commenting";
import { buildCommentLine, buildCommentBlock, getIndentColumn, parseFancyCommentLine, FormattingConfig, DEFAULT_CONFIG } from "./formatting";
import { DevHost, DevModule } from "./devHooks";
import { ExecuteAboutCommand } from "./About";

// FancyLib's ShowError/ShowInfo take the product name as their own argument
// and prefix the message with it, so the name is stated once here instead of
// being repeated inside every message string. Phase 4 moves this to
// Constants.ts alongside the rest.
// -----------------------------------------------------------------------------
const APP_NAME = "Saturno FancyComments";

//
// LIFECYCLE
//

/**
 * Loads `Source/dev/` if it was compiled into this build.
 *
 * A production build excludes that directory from its tsconfig, so
 * `out/Source/dev` does not exist and this require throws - the dev
 * commands are never registered. The production packaging step also strips
 * them from the manifest, so the function is not installed rather than
 * merely hidden.
 */
// -----------------------------------------------------------------------------
function loadDevModule(): DevModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("./dev") as DevModule;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
export function activate(context: vscode.ExtensionContext): void {
  const dev = loadDevModule();
  if (dev) {
    const host: DevHost = {
      extensionVersion: (context.extension?.packageJSON?.version as string) ?? "unknown",
    };
    dev.registerDevCommands(context, host);
  }


  context.subscriptions.push(
    vscode.commands.registerCommand(
      "saturno-fancy-comments.singleLineComment",
      () => {
        void executeSingleLineComment();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "saturno-fancy-comments.multiLineComment",
      () => {
        void executeMultiLineComment();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "saturno-fancy-comments.about",
      () => {
        void ExecuteAboutCommand(context);
      }
    )
  );
}

// -----------------------------------------------------------------------------
export function deactivate(): void { }

//
// COMMANDS
//

interface ExtensionConfig extends FormattingConfig {
  commentImplementation: "syntax" | "vscode";
}

// -----------------------------------------------------------------------------
function getExtensionConfig(): ExtensionConfig {
  const cfg = vscode.workspace.getConfiguration("saturno-fancy-comments");

  return {
    lineWidth: cfg.get<number>("lineWidth", DEFAULT_CONFIG.lineWidth),
    separatorChar: cfg.get<string>("separatorChar", DEFAULT_CONFIG.separatorChar),
    separatorPrefixLength: cfg.get<number>("separatorPrefixLength", DEFAULT_CONFIG.separatorPrefixLength),
    commentImplementation: normalizeCommentImplementation(
      cfg.get<string>("commentImplementation", "vscode")
    ),
  };
}

// -----------------------------------------------------------------------------
async function executeMultiCursorSingleLine(
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
    const parsed = parseFancyCommentLine(
      lineText,
      inferFancyCommentLineSyntax(lineText, config) ?? syntax, config
    );

    return {
      line,
      column,
      lineText,
      value: parsed?.text ?? buildCommentLine(syntax, lineText.trim(), config, column),
    };
  });

  await editor.edit((editBuilder) => {
    for (const replacement of replacements) {
      editBuilder.replace(new vscode.Range(replacement.line, replacement.column, replacement.line, replacement.lineText.length), replacement.value);
    }
  });
}

// -----------------------------------------------------------------------------
async function executeMultiCursorMultiLine(editor: vscode.TextEditor, config: ExtensionConfig): Promise<void> {
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
    const column = getIndentColumn(lineText, 0);
    const found = findFancyCommentBlockUsingKnownSyntaxFirst(documentLines, line, syntax, config);
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
    const block = buildCommentBlock(syntax, indent, lineText.trim());
    const separator = indent + buildCommentLine(syntax, "", config, indent.length);
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
async function executeSingleLineComment(): Promise<void> {
  const editor = Fancy.EditorUtils.GetActiveEditor();
  if (!editor) {
    Fancy.EditorUtils.ShowError(APP_NAME, "no active editor");
    return;
  }
  if (editor.selections.length > 1) {
    await executeMultiCursorSingleLine(editor, getExtensionConfig());
    return;
  }

  const config = getExtensionConfig();
  const line = editor.selection.start.line;
  const lineText = editor.document.lineAt(line).text;
  const column = getIndentColumn(lineText, editor.selection.start.character);

  const resolvedSyntax = Fancy.CommentDetection.GetCommentSyntaxForEditor(editor);
  const existingSyntax = inferFancyCommentLineSyntax(lineText, config) ?? resolvedSyntax;
  if (existingSyntax) {
    const parsed = parseFancyCommentLine(lineText, existingSyntax, config);
    if (parsed !== null) {
      await editor.edit((editBuilder) => {
        const range = new vscode.Range(line, column, line, lineText.length);
        editBuilder.replace(range, parsed.text);
      });
      return;
    }
  }

  if (config.commentImplementation === "vscode") {
    const applied = await applyFancySingleLineCommentViaVSCode(editor, line, column, lineText, config);
    if (applied) {
      return;
    }
  }

  if (!resolvedSyntax) {
    Fancy.EditorUtils.ShowError(APP_NAME, `unsupported language "${editor.document.languageId}"`);
    return;
  }

  const text = lineText.trim();
  const commentLine = buildCommentLine(resolvedSyntax, text, config, column);

  await editor.edit((editBuilder) => {
    const range = new vscode.Range(line, column, line, lineText.length);
    editBuilder.replace(range, commentLine);
  });
}

// -----------------------------------------------------------------------------
async function executeMultiLineComment(): Promise<void> {
  const editor = Fancy.EditorUtils.GetActiveEditor();
  if (!editor) {
    Fancy.EditorUtils.ShowError(APP_NAME, "no active editor");
    return;
  }
  if (editor.selections.length > 1) {
    await executeMultiCursorMultiLine(editor, getExtensionConfig());
    return;
  }

  const config = getExtensionConfig();
  const line = editor.selection.start.line;
  const lineText = editor.document.lineAt(line).text;
  const column = getIndentColumn(lineText, editor.selection.start.character);
  const resolvedSyntax = Fancy.CommentDetection.GetCommentSyntaxForEditor(editor);
  const doc = editor.document;

  const windowStart = 0;
  const windowEnd = doc.lineCount;
  const windowLines: string[] = [];
  for (let i = windowStart; i < windowEnd; i++) {
    windowLines.push(doc.lineAt(i).text);
  }

  const found = findFancyCommentBlockUsingKnownSyntaxFirst(
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

  if (shouldUseVSCodeBlockComment(config.commentImplementation, editor.selection.isEmpty, resolvedSyntax)) {
    const applied = await applyFancyMultiLineCommentViaVSCode(editor, line, column, lineText, config);
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

  const commentBlock = buildCommentBlock(resolvedSyntax, indent, text);
  const commentLine = buildCommentLine(resolvedSyntax, "", config, column);

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
async function applyFancySingleLineCommentViaVSCode(
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
  const extracted = extractCommentedText(commentedLine.slice(column), originalLineText.slice(column));

  if (!extracted) {
    await restoreLine(editor, line, originalLineText, originalSelection);
    return false;
  }

  await vscode.commands.executeCommand("undo");

  const commentLine = buildCommentLine(extracted.syntax, extracted.text, config, column);

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
async function applyFancyMultiLineCommentViaVSCode(
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
  const extracted = extractCommentedText(commentedLine.slice(column), originalLineText.slice(column));

  if (!extracted || extracted.syntax.singleLineEnd.length === 0) {
    await restoreLine(editor, line, originalLineText, originalSelection);
    return false;
  }

  await vscode.commands.executeCommand("undo");

  const text = extracted.text;
  const indent = " ".repeat(column);
  const commentBlock = buildCommentBlock(extracted.syntax, indent, text);
  const commentLine = buildCommentLine(extracted.syntax, "", config, column);
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
async function restoreLine(
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

