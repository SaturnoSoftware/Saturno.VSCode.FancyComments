# Repository-facing audit - release 3.0.0

Audit date: 2026-08-24

## Verified in the versioned repository

- `package.json` declares the extension identity, GPL-3.0-only license, VS Code engine, repository URL, issue tracker URL, homepage, icon, commands, and VSIX packaging configuration.
- `README.md` has current Marketplace and VSIX installation instructions, configuration, command usage, selection behavior, local development commands, license, and maintained links.
- `LICENSE.txt`, `CHANGELOG.md`, `.github/workflows/quality-gate.yml`, `.github/workflows/release.yml`, and `.github/actions/setup/action.yml` are present.
- Generated build output and VSIX files are ignored by `.gitignore`.

## Deliberately not verified remotely

This release work did not access GitHub. Repository description, topics, default branch settings, branch protection, Actions run history, Marketplace publication state, and GitHub-hosted issue/PR templates remain unverified and must be checked in the hosting UI by a maintainer if required.