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
// File      : ConfigResolution.ts                                            //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2026-09-21                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// License   : GPLv3                                                          //
// -------------------------------------------------------------------------- //
// SPDX-License-Identifier: GPL-3.0-only

/**
 * The one place that reads settings out of the editor. Everything it returns
 * has already been through Config.ts's NormalizeConfig, so no caller has to
 * wonder whether a value came from a validated settings UI or a hand-edited
 * settings.json.
 */

// -----------------------------------------------------------------------------
import * as vscode from "vscode";
// -----------------------------------------------------------------------------
import { CONFIG_SECTION } from "./Constants";
import { DEFAULT_EXTENSION_CONFIG, ExtensionConfig, NormalizeConfig } from "./Config";

// -----------------------------------------------------------------------------
export function GetConfig(): ExtensionConfig {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return NormalizeConfig({
    lineWidth: cfg.get<number>("lineWidth", DEFAULT_EXTENSION_CONFIG.lineWidth),
    separatorChar: cfg.get<string>("separatorChar", DEFAULT_EXTENSION_CONFIG.separatorChar),
    separatorPrefixLength: cfg.get<number>(
      "separatorPrefixLength",
      DEFAULT_EXTENSION_CONFIG.separatorPrefixLength
    ),
    commentImplementation: cfg.get<ExtensionConfig["commentImplementation"]>(
      "commentImplementation",
      DEFAULT_EXTENSION_CONFIG.commentImplementation
    ),
  });
}
