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
// File      : Constants.ts                                                   //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2026-09-21                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// License   : GPLv3                                                          //
// -------------------------------------------------------------------------- //

/**
 * The identifiers this extension publishes.
 *
 * CONFIG_SECTION is a public contract twice over: it prefixes every command
 * id and it is the section every setting is stored under in the user's
 * settings.json. Changing it breaks their keybindings and silently resets
 * their settings to the defaults, so it changes only with a migration.
 */

//
// IDENTITY
//

// -----------------------------------------------------------------------------
export const CONFIG_SECTION = "saturno-fancy-comments";
export const EXTENSION_ID = "saturno.fancy-comments";
export const APP_NAME = "Saturno FancyComments";

//
// COMMANDS
//

// Must match contributes.commands in package.json, exactly.
// -----------------------------------------------------------------------------
export const COMMAND_SINGLE_LINE_COMMENT = `${CONFIG_SECTION}.singleLineComment`;
export const COMMAND_MULTI_LINE_COMMENT = `${CONFIG_SECTION}.multiLineComment`;
export const COMMAND_ABOUT = `${CONFIG_SECTION}.about`;

// Must match the `when` clause of the dev entries in contributes.menus.
// -----------------------------------------------------------------------------
export const DEV_MODE_CONTEXT_KEY = "saturnoFancyComments.devMode";
