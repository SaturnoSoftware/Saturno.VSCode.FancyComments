# FancyComments usage notes

## Single-line separators

**Saturno: Fancy Comment** formats the current line using the active language comment syntax. Run the command again on that generated separator to return to plain text.

## Multi-line blocks

**Saturno: Multi Line Comment** creates a three-part block: opening delimiter, one body line per input line, and closing delimiter. The block parser accepts delimiter-adjacent body markers such as `*Title` as well as `* Title`, but it requires the matching closing delimiter and indentation before it toggles anything. This prevents ordinary prose from being treated as a generated block.

The command finds an existing generated block anywhere in the open document, so toggling works when the cursor is on any line in that block. Spaces, tabs, and mixed indentation are retained on every generated line.

## Selections and multiple cursors

A single multi-line selection is preserved as the body of a multi-line block. Repeating the command restores the selected text. Multiple cursors are processed atomically in source order after duplicate lines are removed; a failure to resolve the language syntax leaves the document unchanged. For a multi-line selection, use one cursor only.