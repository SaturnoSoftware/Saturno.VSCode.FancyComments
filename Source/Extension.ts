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
// File      : Extension.ts                                                   //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2024-05-03                                                     //
// Copyright : Saturno Software - 2024 - 2026                                 //
// Author    : mateusdigital <hello@mateus.digital>                           //
// License   : GPLv3                                                          //
// -------------------------------------------------------------------------- //
// SPDX-License-Identifier: GPL-3.0-only

/**
 * Activation and command registration, and nothing else. The command bodies
 * are in Commands.ts, the About panel in About.ts, the settings in Config.ts
 * and ConfigResolution.ts.
 */

// -----------------------------------------------------------------------------
import * as vscode from "vscode";
// -----------------------------------------------------------------------------
import { ExecuteAboutCommand } from "./About";
import { ExecuteMultiLineComment, ExecuteSingleLineComment } from "./Commands";
import { CONFIG_SECTION } from "./Constants";
import { DevHost, DevModule } from "./DevHooks";

//
// LIFECYCLE
//

/**
 * Loads `Source/dev/` if it was compiled into this build.
 *
 * A production build excludes that directory from its tsconfig, so
 * `out/Source/dev` does not exist and this require throws - the dev
 * commands are never registered. The production packaging step also strips
 * them from the manifest, so the function is not installed rather than
 * merely hidden.
 *
 * That directory is also the only place allowed to import FancyLib's
 * `Source/Debug` entry point (VSCODEKIT-0026), which is what keeps the Open
 * Bug domain out of a production build entirely.
 */
// -----------------------------------------------------------------------------
function _LoadDevModule(): DevModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("./dev") as DevModule;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
export function activate(context: vscode.ExtensionContext): void {
  const dev = _LoadDevModule();
  if (dev) {
    const host: DevHost = {
      extensionVersion: (context.extension?.packageJSON?.version as string) ?? "unknown",
    };
    dev.registerDevCommands(context, host);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(`${CONFIG_SECTION}.singleLineComment`, () => {
      void ExecuteSingleLineComment();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(`${CONFIG_SECTION}.multiLineComment`, () => {
      void ExecuteMultiLineComment();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(`${CONFIG_SECTION}.about`, () => {
      void ExecuteAboutCommand(context);
    })
  );
}

// -----------------------------------------------------------------------------
export function deactivate(): void { }
