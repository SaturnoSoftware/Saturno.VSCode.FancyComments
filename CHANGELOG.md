# Changelog

All notable changes to Saturno FancyComments are documented here.

Entries before 3.3.0 are reconstructed from the repository's git history: this file did not
exist until 2026-09-21, so anything older than the commits it was written from is summarized
rather than recorded at the time.

## 3.4.4 - 2026-10-04

### Added
- `saturno-fancy-comments.preferSingleLineComments` uses line-comment syntax for new multiline
  comment blocks when the language supports it. It defaults to `true`; block-only languages
  continue to use their native block comments, and the setting can be disabled to retain the
  previous formatting preference.

### Fixed
- The multiline comment command now honors the requested single-line style even when VS Code
  exposes the language's comment command but FancyComments cannot read its language configuration.

## 3.4.2 - 2026-10-04

### Added
- `saturno-fancy-comments.separatorBlankLines` controls the number of blank lines between a
  multiline comment block and its separator line. It defaults to `0`, preserving the existing
  output, and accepts values from `0` to `20`.

### Fixed
- The lockfile now matches the package version and the pinned TypeScript 5.3.3 dependency, so
  clean installs no longer resolve TypeScript 5.9.3 against a 5.3.3 package declaration.

## 3.4.0 - 2026-09-21

### Changed
- `Source/` is split into an adapter and a core, the shape the VS Code extension standard
  asks for. `Extension.ts` is a table of commands and nothing else; `Commands.ts` holds the
  bodies; `Source/Core/` holds `Config.ts`, `Commenting.ts` and `Formatting.ts`, none of
  which may reach `vscode` - directly or through the FancyLib barrel, which re-exports
  modules that do. `Tests/purity.test.ts` is the new gate that says so.
- The About panel moved to FancyLib. `Source/About.ts` was 177 lines of webview plumbing
  that differed from FancyHeader's copy in six data values; it is now a 59-line `AboutSpec`
  declaring the name, the description and the products in the grid. FancyLib 1.3.0 owns the
  webview, the CSP nonce, the template load and the URI resolution.
- The development-only Open Bug command moved to FancyLib for the same reason. `Source/dev/`
  was 203 lines identical to FancyHeader's but for six values, and is now 48 lines that name
  the settings section, the marketplace id, the devMode key and the bug-title placeholder.
- `Source/DevHooks.ts` is gone; the `DevHost`/`DevModule` contract was never
  extension-specific and now lives in FancyLib.
- Comments no longer open with tracker ids. The reasoning each one carried is kept.

### Fixed
- The About command failed with file-not-found when the extension ran unbuilt. `about.html`
  and `about.css` are checked into FancyLib and copied into `Resources/` by the build
  script, so a working tree has no copy and pressing F5 gave a broken command. The panel now
  falls back to the submodule's own source path.
- FancyLib's test suites were never actually running from this repository. `npm test` pointed
  `node --test` at `out/Libraries/.../tests/*.test.js`, a path the compiler never wrote, and
  node ignores a glob that matches nothing rather than failing. The suite reports 579 tests
  now, against 427 before, with no new test written for the difference.
- The test suite raced its own build gate. `Tests/productionBuildIsolation.test.ts` runs the
  real `Scripts/build.ps1`, which wipes `./out` unconditionally - the same directory the rest
  of the suite had just been compiled into. Whether the run survived depended on how far node
  had got loading the remaining files. The suite compiles to `out-tests/` now, which the build
  never touches.
- `npm run lint`, `npm test`, `tsconfig.json`'s `exclude` and `.vscodeignore` all spelled the
  test directory `tests` while the directory on disk is `Tests`. Every one of them only
  resolved because Windows does not distinguish the two; the directory is tracked as `Tests`
  now and every reference matches it.
- The release-only VSIX contract check in `Scripts/package.ps1` matched `tests/` lowercase,
  so the renamed tree would have passed a guard meant to reject it.
- `Tests/extensionAssets.test.ts` asserted that the staged build contained
  `out/Source/extension.js`; the file is `Extension.js`, and the assertion passed only by the
  same case-insensitivity.

## 3.3.0 - 2026-09-21

### Fixed
- The dev-only Open Bug domain compiled into production builds. The extension's single
  FancyLib barrel import reached `DevBugReport`/`DevBugReportPanel` through the library's
  `Source/index.ts`, and a static re-export is a static dependency, so the store artifact
  carried a bug-reporting domain it had no command to invoke. FancyLib 1.2.0 gives that domain
  its own entry point (`Source/Debug`), which only `Source/dev/` imports and
  `tsconfig.prod.json` excludes. `tests/productionBuildIsolation.test.ts` asserts it strictly
  again, and a real production package now contains zero `DevBugReport` files
  (VSCODEKIT-0026).
- The `Saturno: About FancyComments` command shipped without its page. The extension
  read `media/about.html` and `media/about.css` from the installed extension, but
  `Scripts/build.ps1` never staged `media/` into the build output that `Scripts/package.ps1`
  turns into the `.vsix` - the only asset in the packaged artifact was
  `Resources/images/icon.png`. The command was registered and failed with file-not-found the
  first time anyone ran it (FANCYCMNT-B0008).
- A development-channel package could never succeed. The VSIX contract check in
  `Scripts/package.ps1` rejected sourceMaps and compiled FancyLib tests on every channel, and
  a development build emits both by definition. The only way to get `package` to succeed was
  `-Environment production`, which is why every `-dev` artifact in the build registry was
  actually a production build with no `Source/dev/` and no `dev.reportBug` command
  (FANCYCMNT-B0006, FANCYCMNT-B0007). The check is now scoped to the release channel, the way
  FancyHeader already fixed it as VSCODEKIT-B0026.
- Debug (`F5`) no longer depends on `${defaultBuildTask}` resolving through the npm task
  provider: `.vscode/tasks.json`'s watch task is now an explicit `shell` task (not `npm`), and
  `.vscode/launch.json`'s `preLaunchTask` references it by its literal label `"watch"`.
  Removes a real race where the npm provider's background scan had not finished by the time F5
  tried to resolve the default build task, which failed with
  "Couldn't find task ${defaultBuildTask}".

### Changed
- `Source/` is split by responsibility, matching FancyHeader: `Extension.ts` (activation and
  command registration only), `Commands.ts` (the editor work behind the two commands),
  `Config.ts` (the settings shape and its normalization, importing nothing from `vscode`),
  `ConfigResolution.ts` (the `workspace.getConfiguration` adapter), `Constants.ts`, `About.ts`,
  and the pure core in `Commenting.ts` and `Formatting.ts`. Settings coming from a hand-edited
  `settings.json` are now clamped through `NormalizeConfig` instead of being trusted as read.
- Naming follows the Saturno model decided 2026-09-21: `PascalCase` public functions,
  `_PascalCase` internal ones, `PascalCase.ts` file names. No behaviour changed, and the
  extension's command ids and configuration keys are untouched, since those are public
  contract.
- The About panel is now the full Saturno About experience - header card, Saturno Software
  publisher card, and a "More Software" grid (presskit.diy, Gosh, Fancy Header) - rendered
  from the shared template in `Saturno.VSCode.FancyLib` (`Source/AboutPage/`) through
  `RenderAboutPage(template, data)`. The panel code moved out of the extension entry point
  into its own `Source/About.ts`.
- `media/` is retired. The page template stages from FancyLib into
  `Resources/AboutPage/` on every build, and the extension's own icon plus every product icon
  now live together under `Resources/icons/`. `package.json`'s `"icon"` points at
  `Resources/icons/icon.png`.
- Pins `Saturno.VSCode.FancyLib` 1.2.0 (`2d3de46`), which splits the shared modules per domain
  and moves the dev-only domain behind `Source/Debug`. `Source/Types.ts`,
  `Source/CommentSyntax.ts` and `Source/CommentSyntaxCore.ts` are gone from the library;
  `CommentSyntax` and the syntax resolver now live in `CommentUtils`, and the editor-facing
  detection in `CommentDetection`.
- `Extension.ts` and `Commands.ts` take a single `import * as Fancy from ".../FancyLib/Source"`
  barrel for the adapter layer, matching FancyHeader. The pure core (`Commenting.ts`,
  `Formatting.ts`) still imports its one library module directly so it never reaches `vscode`.
- `tests/commentSyntaxCore.test.ts` is removed: it duplicated coverage that now lives in
  FancyLib's own suite, which this repository's `npm test` already runs.
- `tests/extensionAssets.test.ts` now asserts against the staged build output, not the
  repository tree. Asserting against the repository is what let the About asset regression ship
  while the test stayed green.

## 3.2.1 - 2026-09-18

### Fixed
- `Scripts/release/get-release-assets.ps1` used the wrong output directory argument when
  picking the artifact to publish.
- Packaged `.vsix` filenames are suffixed by build channel so a development or rc artifact
  cannot be mistaken for the release one (FANCYCMNT-0055).

### Changed
- Adopted `spb`'s `--registry` GitHub Release publishing for the development and rc channels
  (VSCODEKIT-0025).
- Pins `Saturno.VSCode.FancyLib` 1.0.1.

## 3.2.0 - 2026-09-16

### Added
- Development-only Open Bug reporting, from the shared FancyLib capability, plus a real
  production build channel that strips the dev command, menu entry and compiled module from a
  store build (FANCYCMNT-0053).

### Fixed
- `vsce` packaged the live repository tree through its own `vscode:prepublish` hook, ignoring
  what the production build had staged, so `--environment production` had no effect on the
  shipped `.vsix`. Packaging now consumes the staged build output (FANCYCMNT-0054).

## 3.1.1 - 2026-09-15

### Fixed
- Multiline comments preferred the block-comment action even where a line-comment syntax
  resolved first (FANCYCMNT-B0001).
- The VSIX payload is isolated: `Source`, `Libraries` and compiled FancyLib tests no longer
  ship, while the compiled runtime library still does.
- Fancy runtime dependencies (`json5`) are packaged instead of being assumed present.
- Added a native-Windows-generated `package-lock.json` for reproducible installs
  (FANCYCMNT-B0005).

## 3.1.0 - 2026-09-14

### Changed
- Consolidated the shared library as `Libraries/Saturno.VSCode.FancyLib`, replacing the older
  `libs/Saturno.VSCodeKit` gitlink (WSPROC-0108, FANCYCMNT-0052).
- Applied the approved Marketplace short description (FANCYCMNT-0028).
- Naming-convention lint and measured formatting latency (FANCYCMNT-0046).

## 3.0.0 - 2026-08-25

### Changed
- Repository reorganized under the `Saturno.VSCode.FancyComments` namespace, with the public
  history cut to a single root commit and the repository links updated to the new location.
- GitHub Actions workflows removed in favour of the local `spb` build and release pipeline.
