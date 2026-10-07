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
 * Runs the real production build into a throwaway output
 * directory and checks the result with FancyLib's independent
 * BuildIsolation contract - a shared helper, but a check this repo runs for
 * itself, so a regression in build.ps1 or tsconfig.prod.json fails right
 * here.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";

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
 *  narrowed it to `["Source"]`. */
// -----------------------------------------------------------------------------
function fancyCommentsIsolationContract(): BuildChannelIsolationContract {
  const contract = defaultBuildChannelIsolationContract();
  return {
    ...contract,
    devOutputPathPattern: new RegExp(`${contract.devOutputPathPattern.source}|devbugreport|[/\\\\]tests[/\\\\]`, "i"),
  };
}

function productionBuildOutput(): string | null {
  const buildOutputDir = process.env.SATURNO_SPB_BUILD_OUTPUT_DIR;
  if (buildOutputDir && fs.existsSync(buildOutputDir)) {
    return buildOutputDir;
  }

  console.log("    (no SPB production build output; this assertion runs during spb release)");
  return null;
}

// -----------------------------------------------------------------------------
describe("Production build isolation", () => {
  it("ships a manifest and output tree with no dev command, menu entry, setting, FancyLib test or Open Bug module", () => {
    const buildOutputDir = productionBuildOutput();
    if (!buildOutputDir) return;
    const violations = assertProductionBuildIsolation({
      packageJsonPath: path.join(buildOutputDir, "package.json"),
      outputDirectory: buildOutputDir,
      contract: fancyCommentsIsolationContract(),
    });
    assert.deepEqual(violations, []);
  });

  it("removes the whole commandPalette group once its only entry (the dev command) is stripped", () => {
    const buildOutputDir = productionBuildOutput();
    if (!buildOutputDir) return;
    const manifest = JSON.parse(fs.readFileSync(path.join(buildOutputDir, "package.json"), "utf8"));
    assert.equal(manifest.contributes.menus, undefined);
  });

  it("fails when the FancyLib Open Bug domain leaks in via a re-created wholesale-include path", () => {
    const buildOutputDir = productionBuildOutput();
    if (!buildOutputDir) return;
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
