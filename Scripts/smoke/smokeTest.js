// SPDX-License-Identifier: GPL-3.0-only

// Extension-host smoke test for the packaged saturno-fancy-comments .vsix.
//
// Runs inside a real VS Code extension host (launched with
// --extensionTestsPath pointing at this file), against the extension as
// actually installed from the .vsix - not against source. It exercises the
// two user-facing commands end to end: each one must visibly change the
// document, not just execute without throwing.
//
// Invoked by Scripts/smoke/run-smoke.ps1. See FANCYCMNT-0027.

const assert = require('assert');
const vscode = require('vscode');

async function openScratchDoc(content) {
    const doc = await vscode.workspace.openTextDocument({ content, language: 'javascript' });
    const editor = await vscode.window.showTextDocument(doc);
    return editor;
}

async function closeActiveEditor() {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}

async function checkSingleLineComment() {
    const editor = await openScratchDoc('let x = 1;\n');
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    await vscode.commands.executeCommand('saturno-fancy-comments.singleLineComment');
    const text = editor.document.getText();
    assert.notStrictEqual(text, 'let x = 1;\n', 'singleLineComment did not change the document');
    assert.match(text, /\/\/\s*-{3,}/, `singleLineComment output did not look like a separator: ${JSON.stringify(text)}`);
    await closeActiveEditor();
}

async function checkMultiLineComment() {
    const editor = await openScratchDoc('let y = 2;\n');
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    await vscode.commands.executeCommand('saturno-fancy-comments.multiLineComment');
    const text = editor.document.getText();
    assert.notStrictEqual(text, 'let y = 2;\n', 'multiLineComment did not change the document');
    assert.match(text, /\/\*/, `multiLineComment output did not contain a block-comment opener: ${JSON.stringify(text)}`);
    await closeActiveEditor();
}

async function main() {
    const ext = vscode.extensions.getExtension('SaturnoSoftware.saturno-fancy-comments');
    assert.ok(ext, 'saturno-fancy-comments is not installed in this profile');
    await ext.activate();

    await checkSingleLineComment();
    await checkMultiLineComment();
}

exports.run = function run(_testsRoot, callback) {
    main().then(
        () => callback(null),
        (err) => callback(err)
    );
};
