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

async function checkPlainCodeIsNotCollapsed() {
    const editor = await openScratchDoc(
        'const total = items.length;\nconst first = items[0];\nreturn first;\n'
    );
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    await vscode.commands.executeCommand('saturno-fancy-comments.multiLineComment');
    const text = editor.document.getText();
    assert.match(text, /const total = items\.length;/, 'the first source line was lost');
    assert.match(text, /const first = items\[0\];/, 'the second source line was lost');
    assert.match(text, /return first;/, 'the third source line was lost');
    await closeActiveEditor();
}

async function checkJSDocContentIsPreserved() {
    const editor = await openScratchDoc('/**\n * First sentence.\n * Second sentence.\n */\n');
    editor.selection = new vscode.Selection(1, 3, 1, 3);
    await vscode.commands.executeCommand('saturno-fancy-comments.multiLineComment');
    const text = editor.document.getText();
    assert.match(text, /First sentence\./, 'the first JSDoc line was lost');
    assert.match(text, /Second sentence\./, 'the second JSDoc line was lost');
    assert.match(text, /^\/\*\*/, 'the original JSDoc opener was not preserved');
    assert.match(text, /\*\//, 'the original JSDoc closer was not preserved');
    await closeActiveEditor();
}

async function checkConfiguredSeparatorSpacingRoundTrips() {
    const settings = vscode.workspace.getConfiguration('saturno-fancy-comments');
    const previousValue = settings.get('separatorBlankLines', 0);
    await settings.update('separatorBlankLines', 1, vscode.ConfigurationTarget.Global);

    try {
        const original = 'let spaced = true;\n';
        const editor = await openScratchDoc(original);
        editor.selection = new vscode.Selection(0, 0, 0, 0);
        await vscode.commands.executeCommand('saturno-fancy-comments.multiLineComment');

        const lines = editor.document.getText().split(/\r?\n/);
        const closerLine = lines.findIndex((line) => line.trim() === '*/');
        assert.ok(closerLine >= 0, 'the generated block comment has no closer');
        assert.strictEqual(lines[closerLine + 1], '', 'one blank line should precede the separator');
        assert.match(lines[closerLine + 2], /^\/\/ ---/, 'the separator should follow the blank line');

        editor.selection = new vscode.Selection(closerLine + 1, 0, closerLine + 1, 0);
        await vscode.commands.executeCommand('saturno-fancy-comments.multiLineComment');
        assert.ok(editor.document.getText().includes('let spaced = true;'), 'toggling lost the original text');
        assert.doesNotMatch(editor.document.getText(), /^\/\*|^\/\/ ---/m, 'toggling left an orphan block or separator');
        await closeActiveEditor();
    } finally {
        await settings.update('separatorBlankLines', previousValue, vscode.ConfigurationTarget.Global);
    }
}

async function main() {
    const ext = vscode.extensions.getExtension('SaturnoSoftware.saturno-fancy-comments');
    assert.ok(ext, 'saturno-fancy-comments is not installed in this profile');
    await ext.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
        commands.includes('saturno-fancy-comments.dev.reportBug'),
        'the development-only reportBug command is missing from this DEV package'
    );

    await checkSingleLineComment();
    await checkMultiLineComment();
    await checkPlainCodeIsNotCollapsed();
    await checkJSDocContentIsPreserved();
    await checkConfiguredSeparatorSpacingRoundTrips();
}

exports.run = function run(_testsRoot, callback) {
    main().then(
        () => callback(null),
        (err) => callback(err)
    );
};
