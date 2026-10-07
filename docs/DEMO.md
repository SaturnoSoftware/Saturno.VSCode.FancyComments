# FancyComments demo

Use this workspace configuration to exercise the release features:

```json
{
  "saturno-fancy-comments.lineWidth": 72,
  "saturno-fancy-comments.separatorChar": "=",
  "saturno-fancy-comments.separatorPrefixLength": 3,
  "saturno-fancy-comments.commentImplementation": "extension"
}
```

1. Put the cursor on a JavaScript or TypeScript line and run **Saturno: Fancy Comment**. Run it again to restore the original text.
2. Put the cursor on an indented line and run **Saturno: Multi Line Comment**. The opening delimiter, each body line, and the closing delimiter retain the same indentation.
3. Select multiple independent lines with multiple cursors and run either command. The command applies all replacements in one editor edit.
4. Select multiple lines with one cursor and run **Saturno: Multi Line Comment**. The selected text becomes the block body; rerunning the command restores the original text.

Multiple cursors cannot include a multi-line selection. Use one cursor for that case so the operation remains unambiguous.