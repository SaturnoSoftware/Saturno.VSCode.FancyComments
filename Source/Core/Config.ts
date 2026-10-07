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
// File      : Config.ts                                                      //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2026-09-21                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// License   : GPLv3                                                          //
// -------------------------------------------------------------------------- //

/**
 * The extension's settings as a plain value, and the normalization that
 * makes an arbitrary settings.json safe to use. Reading the settings out of
 * the editor is ConfigResolution.ts's job, one directory up.
 */

// -----------------------------------------------------------------------------
import * as Utils from "../../Libraries/Saturno.VSCode.FancyLib/Source/Utils";
import {
  CommentImplementation,
  NativeBlockDelimiters,
  NormalizeCommentImplementation,
  NormalizeNativeBlockDelimiters,
} from "./Commenting";
import { DEFAULT_CONFIG, FormattingConfig } from "./Formatting";

//
// TYPES
//

// -----------------------------------------------------------------------------
export interface ExtensionConfig extends FormattingConfig {
  commentImplementation: CommentImplementation;
  nativeBlockDelimiters: NativeBlockDelimiters;
  preferSingleLineComments: boolean;
}

// -----------------------------------------------------------------------------
export const DEFAULT_EXTENSION_CONFIG: ExtensionConfig = {
  ...DEFAULT_CONFIG,
  commentImplementation: "vscode",
  nativeBlockDelimiters: "preserve",
  preferSingleLineComments: true,
};

//
// NORMALIZATION
//

/**
 * Every field comes from the user's settings.json, so every field can be
 * absent, the wrong type, or out of range. The bounds match what
 * package.json's contributes.configuration declares, which VS Code enforces
 * in its settings UI and does not enforce for a hand-edited file.
 */
// -----------------------------------------------------------------------------
export function NormalizeConfig(config: Partial<ExtensionConfig>): ExtensionConfig {
  return {
    lineWidth: Utils.NormalizeInteger(config.lineWidth, 20, 200, DEFAULT_EXTENSION_CONFIG.lineWidth),
    separatorChar: Utils.NormalizeChar(config.separatorChar, DEFAULT_EXTENSION_CONFIG.separatorChar),
    separatorPrefixLength: Utils.NormalizeInteger(
      config.separatorPrefixLength,
      1,
      20,
      DEFAULT_EXTENSION_CONFIG.separatorPrefixLength
    ),
    separatorBlankLines: Utils.NormalizeInteger(
      config.separatorBlankLines,
      0,
      20,
      DEFAULT_EXTENSION_CONFIG.separatorBlankLines
    ),
    commentImplementation: NormalizeCommentImplementation(config.commentImplementation),
    nativeBlockDelimiters: NormalizeNativeBlockDelimiters(config.nativeBlockDelimiters),
    preferSingleLineComments: config.preferSingleLineComments !== false,
  };
}
