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

/**
 * The one place that reads settings out of the editor.
 *
 * What it returns has already been through Core/Config.ts, so no caller has
 * to wonder whether a value came from the validated settings UI or from a
 * hand-edited settings.json.
 */

// -----------------------------------------------------------------------------
import * as vscode from "vscode";
// -----------------------------------------------------------------------------
import { CONFIG_SECTION } from "./Constants";
import { DEFAULT_EXTENSION_CONFIG, ExtensionConfig, NormalizeConfig } from "./Core/Config";

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
    separatorBlankLines: cfg.get<number>(
      "separatorBlankLines",
      DEFAULT_EXTENSION_CONFIG.separatorBlankLines
    ),
    commentImplementation: cfg.get<ExtensionConfig["commentImplementation"]>(
      "commentImplementation",
      DEFAULT_EXTENSION_CONFIG.commentImplementation
    ),
    nativeBlockDelimiters: cfg.get<ExtensionConfig["nativeBlockDelimiters"]>(
      "nativeBlockDelimiters",
      DEFAULT_EXTENSION_CONFIG.nativeBlockDelimiters
    ),
    preferSingleLineComments: cfg.get<boolean>(
      "preferSingleLineComments",
      DEFAULT_EXTENSION_CONFIG.preferSingleLineComments
    ),
  });
}
