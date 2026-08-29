<p align="center">
    <img src=".github/imgs/logo.png" width=160 height=160>
</p>


<p align="center">
    <a href="https://github.com/SaturnoSoftware/vscode-fancy-comments/releases"><img src="https://badgen.net/github/release/SaturnoSoftware/vscode-fancy-comments?cache=600" alt="latest release"></a>
    <a href="https://github.com/SaturnoSoftware/vscode-fancy-comments/commits"><img src="https://badgen.net/github/commits/SaturnoSoftware/vscode-fancy-comments?cache=600" alt="commits"></a>
    <a href="./LICENSE.txt"><img src="https://badgen.net/badge/license/GPL--3.0/blue" alt="License: GPL-3.0"></a>
    <a href="./tests"><img src="https://badgen.net/badge/tests/CI%20verified/green" alt="Tests: CI verified"></a>
    <a href="https://marketplace.visualstudio.com/items?itemName=SaturnoSoftware.saturno-fancy-comments"><img src="https://badgen.net/badge/platform/VS%20Code%20%5E1.88.0/blue" alt="Platform"></a>
</p>

<p align="center">
  <b>Insert perfectly formatted comment separators with one keystroke.</b> Language-aware, configurable, toggleable.
  <br>
  <br>
</p>


**Saturno FancyComments** is a VS Code extension that generates consistently formatted single-line and multi-line comment separators. It reads your language's comment syntax automatically and fills to a configurable width. Press once to format, press again to undo.

Maintained by [Saturno.Software](https://saturno.software/).

---

## Quick Start

### Install from Marketplace

```bash
code --install-extension SaturnoSoftware.saturno-fancy-comments
```

### Use

1. Place cursor on a line (empty or with text)
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run `Saturno: Single Line Comment` or `Saturno: Multi Line Comment`

**Before:**
```
CONSTANTS
```

**After (Single Line):**
```
// --- CONSTANTS ----------------------------------------------------------
```
<p align="center">
    <img width="737" height="188" alt="SingleLine(SaturnoFC)" src="https://github.com/user-attachments/assets/d2e694c1-c33f-4c88-a4d3-9ac06195822d" />
</p>

**After (Multi Line):**
```
/*
 * CONSTANTS
 */
// ------------------------------------------------------------------------
```
<p align="center">
    <img width="737" height="188" alt="MultiLine(SaturnoFC)" src="https://github.com/user-attachments/assets/f7462434-e5c8-47bc-b8d5-7440f8ee7669" />
</p>

Press the same command again on the formatted line to **toggle it back** to plain text.

---

## Features

- **Single-Line Separators** -- 80-char formatted comment with fill characters
- **Multi-Line Blocks** -- Open/middle/close block with trailing separator
- **Toggle/Undo** -- Same command strips formatting back to plain text
- **Language-Aware** -- Reads VS Code's language config (`//`, `#`, `<!-- -->`, etc.)
- **Block-Aware** -- Multi-line toggle works with cursor on any line of the block
- **Configurable** -- Line width, fill character, prefix length via VS Code settings
- **Zero Config** -- Works out of the box with sensible defaults

---

## Installation

### From Marketplace

Search for **Saturno FancyComments** in the VS Code Extensions sidebar, or install via CLI:

```bash
code --install-extension SaturnoSoftware.saturno-fancy-comments
```

### From VSIX

```bash
code --install-extension saturno-fancy-comments-3.0.0.vsix
```

### Requirements

- VS Code ^1.88.0

---

## Configuration

All settings are available in VS Code Settings UI under **Saturno FancyComments**, or in `settings.json`:

```json
{
  "saturno-fancy-comments.lineWidth": 80,
  "saturno-fancy-comments.separatorChar": "-",
  "saturno-fancy-comments.separatorPrefixLength": 3
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `lineWidth` | `80` | Total width of generated comment lines (20-200) |
| `separatorChar` | `"-"` | Character used to fill separator lines (single char) |
| `separatorPrefixLength` | `3` | Number of separator characters before the text (1-20) |

### Examples with Different Configs

**Default (`-`, width 80, prefix 3):**
```
// --- Title --------------------------------------------------------------
```

**Stars (`*`, width 80, prefix 3):**
```
// *** Title **************************************************************
```

**Equals (`=`, width 120, prefix 5):**
```
// ===== Title =====================================...============================
```

---

## Commands

| Command | Title | Description |
|---------|-------|-------------|
| `saturno-fancy-comments.singleLineComment` | Saturno: Single Line Comment | Format/toggle a single separator line |
| `saturno-fancy-comments.multiLineComment` | Saturno: Multi Line Comment | Format/toggle a multi-line comment block |

### Suggested Keybindings

Add to your `keybindings.json`:

```json
[
  {
    "key": "ctrl+alt+/",
    "command": "saturno-fancy-comments.singleLineComment"
  },
  {
    "key": "ctrl+alt+shift+/",
    "command": "saturno-fancy-comments.multiLineComment"
  }
]
```

---

## How It Works

### Comment Syntax Detection

The extension reads VS Code's built-in language configuration files (the same ones used by `Toggle Line Comment`). It extracts `lineComment` and `blockComment` definitions for the active file's language. No manual setup required.

Supported out of the box: C, C++, C#, Java, JavaScript, TypeScript, Python, Ruby, Go, Rust, HTML, CSS, Shell, PowerShell, and any language with a VS Code language extension.

### Toggle Detection

When you run the command on a line that's already a fancy comment, the extension detects the pattern (prefix + separator chars + optional text + fill + suffix) and strips it back to plain text. Detection uses your current `separatorChar` setting.

For multi-line blocks, the extension searches the open document for the generated block, so toggle works from any line in that block and only treats a complete, matching block as generated.

---

## Demos and detailed usage

- [Release demo configuration](./docs/DEMO.md)
- [Selection, toggle, and syntax behavior](./docs/USAGE.md)
- [Repository-facing audit](./docs/REPOSITORY-AUDIT.md)

---

## Local Development

```bash
npm install
npm test        # Compile + run 416 tests
npm run lint    # ESLint check
npm run build   # Full build + staging
npm run package # Create .vsix
```

Before a release, `Scripts/smoke/run-smoke.ps1 -VsixPath <path-to-vsix>` installs the packaged
`.vsix` into an isolated `--user-data-dir`/`--extensions-dir` and runs
`Scripts/smoke/smokeTest.js` inside a real VS Code extension host to invoke both
`singleLineComment` and `multiLineComment` and assert the document actually changed - a clean-profile
install and command smoke, not just a build that compiles (FANCYCMNT-0027).

---

## Contributing

Contributions welcome! Please:
- Follow existing code style
- Add tests for new features
- Submit pull requests against `main`

---

## License

GPL-3.0 -- See [LICENSE.txt](./LICENSE.txt) for details.

Maintained by [Saturno.Software](https://saturno.software/)

---

## FAQ

**Q: Does it work with my language?**  
A: If VS Code can toggle comments in your language, FancyComments will work. It reads the same language configuration.

**Q: Can I use `*` or `=` instead of `-`?**  
A: Yes. Set `saturno-fancy-comments.separatorChar` to any single character.

**Q: Does toggle work if I change the separator char after creating comments?**  
A: No. Detection uses your current config. Old comments with a different char will be treated as plain text.

**Q: Does it work with multi-cursor / selections?**  
A: Yes. Multiple cursors are applied atomically to their distinct lines. A single multi-line selection is preserved in a block; use one cursor for that case.

**Q: How do I install without the Marketplace?**  
A: Build the `.vsix` with `npm run package`, then `code --install-extension __DIST/*.vsix`.

---

## Links

- [GitHub Repository](https://github.com/SaturnoSoftware/vscode-fancy-comments)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SaturnoSoftware.saturno-fancy-comments)
- [Issues](https://github.com/SaturnoSoftware/vscode-fancy-comments/issues)
- [Saturno.Software](https://saturno.software/)

---
<p align="center">
  <b>Made with <3 by Saturno.Software</b>
</p>
