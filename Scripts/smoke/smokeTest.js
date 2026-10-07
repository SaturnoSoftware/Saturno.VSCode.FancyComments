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

async function openScratchDoc(content, language = 'javascript') {
    const doc = await vscode.workspace.openTextDocument({ content, language });
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
    const lines = text.split(/\r?\n/);
    assert.deepStrictEqual(lines.slice(0, 3), ['//', '// let y = 2;', '//']);
    assert.match(lines[3], /^\/\/ ---/, `multiLineComment did not use line comments: ${JSON.stringify(text)}`);
    assert.doesNotMatch(text, /\/\*/, 'line-capable languages should not get block delimiters by default');
    await closeActiveEditor();
}

async function checkSingleLinePreferenceCanBeDisabled() {
    const settings = vscode.workspace.getConfiguration('saturno-fancy-comments');
    const previousValue = settings.get('preferSingleLineComments', true);
    await settings.update('preferSingleLineComments', false, vscode.ConfigurationTarget.Global);

    try {
        const editor = await openScratchDoc('let block = true;\n');
        editor.selection = new vscode.Selection(0, 0, 0, 0);
        await vscode.commands.executeCommand('saturno-fancy-comments.multiLineComment');
        assert.match(editor.document.getText(), /\/\*/, 'opt-out should retain block-comment formatting');
        await closeActiveEditor();
    } finally {
        await settings.update('preferSingleLineComments', previousValue, vscode.ConfigurationTarget.Global);
    }
}

async function checkLinePreferenceFallsBackForBlockOnlyLanguages() {
    const editor = await openScratchDoc('body { color: red; }\n', 'css');
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    await vscode.commands.executeCommand('saturno-fancy-comments.multiLineComment');
    const text = editor.document.getText();
    assert.match(text, /\/\*/, 'a language without line comments must keep using block comments');
    assert.match(text, /\*\//, 'the block comment must remain well-formed');
    await closeActiveEditor();
}

async function checkTabAndMixedIndentAlignment() {
    const settings = vscode.workspace.getConfiguration('saturno-fancy-comments');
    const previousValue = settings.get('preferSingleLineComments', true);
    await settings.update('preferSingleLineComments', false, vscode.ConfigurationTarget.Global);

    try {
        for (const indent of ['\t', ' \t  ']) {
            const editor = await openScratchDoc(`${indent}const aligned = true;\n`);
            editor.selection = new vscode.Selection(0, indent.length, 0, indent.length);
            await vscode.commands.executeCommand('saturno-fancy-comments.multiLineComment');
            const lines = editor.document.getText().split(/\r?\n/);
            assert.deepStrictEqual(
                lines.slice(0, 3),
                [`${indent}/*`, `${indent}* const aligned = true;`, `${indent}*/`],
                `the generated comment lost its ${JSON.stringify(indent)} indentation`
            );
            await closeActiveEditor();
        }
    } finally {
        await settings.update('preferSingleLineComments', previousValue, vscode.ConfigurationTarget.Global);
    }
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

async function checkNativeBlockCanUseLanguageDefaultLineComments() {
    const settings = vscode.workspace.getConfiguration('saturno-fancy-comments');
    const previousValue = settings.get('nativeBlockDelimiters', 'preserve');
    await settings.update('nativeBlockDelimiters', 'languageDefault', vscode.ConfigurationTarget.Global);

    try {
        const editor = await openScratchDoc('/**\n * First sentence.\n * Second sentence.\n */\n');
        editor.selection = new vscode.Selection(1, 5, 1, 5);
        await vscode.commands.executeCommand('saturno-fancy-comments.multiLineComment');

        const text = editor.document.getText();
        const lines = text.split(/\r?\n/);
        assert.deepStrictEqual(
            lines.slice(0, 4),
            ['//', '// First sentence.', '// Second sentence.', '//'],
            'languageDefault should rewrite the native block with the language line-comment syntax'
        );
        assert.match(lines[4], /^\/\/ ---/, 'the generated separator should use line-comment syntax too');
        assert.doesNotMatch(text, /\/\*\*|\*\//, 'the rewritten block should not retain block delimiters');
        await closeActiveEditor();
    } finally {
        await settings.update('nativeBlockDelimiters', previousValue, vscode.ConfigurationTarget.Global);
    }
}

async function checkConfiguredSeparatorSpacingRoundTrips() {
    const settings = vscode.workspace.getConfiguration('saturno-fancy-comments');
    const previousValue = settings.get('separatorBlankLines', 0);
    const previousLinePreference = settings.get('preferSingleLineComments', true);
    await settings.update('separatorBlankLines', 1, vscode.ConfigurationTarget.Global);
    await settings.update('preferSingleLineComments', false, vscode.ConfigurationTarget.Global);

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
        await settings.update('preferSingleLineComments', previousLinePreference, vscode.ConfigurationTarget.Global);
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
    await checkSingleLinePreferenceCanBeDisabled();
    await checkLinePreferenceFallsBackForBlockOnlyLanguages();
    await checkTabAndMixedIndentAlignment();
    await checkPlainCodeIsNotCollapsed();
    await checkJSDocContentIsPreserved();
    await checkNativeBlockCanUseLanguageDefaultLineComments();
    await checkConfiguredSeparatorSpacingRoundTrips();
}

exports.run = function run(_testsRoot, callback) {
    main().then(
        () => callback(null),
        (err) => callback(err)
    );
};
