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
// File      : productionBuildIsolation.test.ts                               //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2026-09-16                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// -------------------------------------------------------------------------- //
// SPDX-License-Identifier: GPL-3.0-only

/**
 * FANCYCMNT-0053: runs the real production build into a throwaway output
 * directory and checks the result with FancyLib's independent
 * BuildIsolation contract - a shared helper, but a check this repo runs for
 * itself, so a regression in build.ps1 or tsconfig.prod.json fails right
 * here.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { after, before, describe, it } from "node:test";

import {
  assertProductionBuildIsolation,
  BuildChannelIsolationContract,
  defaultBuildChannelIsolationContract,
} from "../Libraries/Saturno.VSCode.FancyLib/Source/BuildIsolation";

// __dirname is the compiled out/tests/ directory - the project root is two
// levels up.
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

/** The generic `.dev.`/`dev/` convention plus this consumer's own knowledge
 *  of what it embeds: FancyLib's Open Bug domain compiles to files and a
 *  directory named `DevBugReport*`, not a `dev/` path segment, so the
 *  generic default alone would miss a barrel-import leak of that whole
 *  module family into a production build - exactly what tsconfig.json's
 *  wholesale "Libraries" include was doing here before tsconfig.prod.json
 *  narrowed it to `["Source"]` (VSCODEKIT-0021/FANCYCMNT-0053). */
// -----------------------------------------------------------------------------
function fancyCommentsIsolationContract(): BuildChannelIsolationContract {
  const contract = defaultBuildChannelIsolationContract();
  return {
    ...contract,
    devOutputPathPattern: new RegExp(`${contract.devOutputPathPattern.source}|devbugreport|[/\\\\]tests[/\\\\]`, "i"),
  };
}

// -----------------------------------------------------------------------------
function runProductionBuild(buildOutputDir: string): void {
  const result = spawnSync(
    "pwsh",
    [
      "-NoLogo",
      "-NoProfile",
      "-File",
      path.join(PROJECT_ROOT, "Scripts", "build.ps1"),
      "-ProjectRoot",
      PROJECT_ROOT,
      "-BuildOutputDir",
      buildOutputDir,
      "-Environment",
      "production",
    ],
    { cwd: PROJECT_ROOT, encoding: "utf8" }
  );
  assert.equal(result.status, 0, `build.ps1 failed:\n${result.stdout}\n${result.stderr}`);
}

// -----------------------------------------------------------------------------
describe("Production build isolation (FANCYCMNT-0053)", () => {
  let buildOutputDir: string;

  before(() => {
    buildOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), "fancycomments-prod-build-"));
    runProductionBuild(buildOutputDir);
  });

  after(() => {
    fs.rmSync(buildOutputDir, { recursive: true, force: true });
  });

  /**
   * 2026-09-21: extension.ts moved to a single
   * `import * as Fancy from ".../FancyLib/Source"` barrel, matching
   * FancyHeader. That barrel re-exports the DevBugReport/DevBugReportPanel
   * domain (VSCODEKIT-0018/0020), so those compiled files now land in a
   * production build too. Known gap, accepted by Mateus on 2026-09-21 in
   * favour of one import shape across the family, tracked by VSCODEKIT-0026.
   *
   * FancyHeader disabled this assertion wholesale. Here it is narrowed
   * instead: the known FancyLib Open Bug output files are subtracted and
   * everything else the contract checks - a dev command, menu entry or
   * setting surviving in the manifest, a compiled FancyLib test, any other
   * module leaking - still fails. Narrowing accepts exactly the gap that was
   * accepted and keeps the coverage that has nothing to do with it. A NEW
   * leak still breaks this test, which a blanket skip would not.
   */
  const KNOWN_BARREL_LEAK = /Saturno\.VSCode\.FancyLib[\\/]Source[\\/]DevBugReport/;

  it("ships a manifest and output tree with no dev command, menu entry, setting or FancyLib test, and no leak beyond the accepted barrel one", () => {
    const violations = assertProductionBuildIsolation({
      packageJsonPath: path.join(buildOutputDir, "package.json"),
      outputDirectory: buildOutputDir,
      contract: fancyCommentsIsolationContract(),
    });

    const accepted = violations.filter(
      (v) => v.kind === "output-file" && KNOWN_BARREL_LEAK.test(v.detail)
    );
    const unaccepted = violations.filter((v) => !accepted.includes(v));

    assert.deepEqual(unaccepted, []);
    // If this ever becomes empty the gap closed, and the narrowing above plus
    // VSCODEKIT-0026 should go with it.
    assert.ok(accepted.length > 0, "the accepted barrel leak is gone; close VSCODEKIT-0026 and restore the strict assertion");
  });

  it("removes the whole commandPalette group once its only entry (the dev command) is stripped", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(buildOutputDir, "package.json"), "utf8"));
    assert.equal(manifest.contributes.menus, undefined);
  });

  it("fails when the FancyLib Open Bug domain leaks in via a re-created wholesale-include path", () => {
    // What tsconfig.json's base "Libraries" include was actually doing
    // before tsconfig.prod.json narrowed it to ["Source"]: compiling every
    // file under the FancyLib submodule - the dev-only Open Bug domain and
    // even FancyLib's own tests - into a production build regardless of
    // whether anything imported it.
    const sourceDir = path.join(buildOutputDir, "out", "Libraries", "Saturno.VSCode.FancyLib", "Source");
    const leakedSubDir = path.join(sourceDir, "DevBugReport");
    const leakedPanelFile = path.join(sourceDir, "DevBugReportPanel.js");
    fs.mkdirSync(leakedSubDir, { recursive: true });
    fs.writeFileSync(leakedPanelFile, "");
    fs.writeFileSync(path.join(leakedSubDir, "Types.js"), "");
    try {
      const violations = assertProductionBuildIsolation({
        packageJsonPath: path.join(buildOutputDir, "package.json"),
        outputDirectory: buildOutputDir,
        contract: fancyCommentsIsolationContract(),
      });
      assert.ok(violations.some((v) => v.kind === "output-file" && v.detail.includes("DevBugReportPanel.js")));
      assert.ok(violations.some((v) => v.kind === "output-file" && v.detail.includes("DevBugReport/Types.js")));
    } finally {
      fs.rmSync(leakedSubDir, { recursive: true, force: true });
      fs.rmSync(leakedPanelFile, { force: true });
    }
  });
});
