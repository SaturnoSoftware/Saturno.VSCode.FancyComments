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
// File      : About.ts                                                       //
// Project   : Saturno.VSCode.FancyComments                                   //
// Date      : 2026-09-21                                                     //
// Copyright : Saturno Software - 2026                                        //
// Author    : mateusdigital <hello@mateus.digital>                           //
// License   : GPLv3                                                          //
// -------------------------------------------------------------------------- //

/**
 * What this extension's About panel says. The panel itself - webview, CSP,
 * template loading, URI resolution - is FancyLib's AboutPanel, identical
 * for every Saturno extension.
 *
 * Every iconFile listed here must exist under Resources/icons/: a packaged
 * extension can only serve webview resources from inside itself, so the
 * grid cannot borrow another extension's copy of an icon.
 */

// -----------------------------------------------------------------------------
import { AboutSpec } from "../Libraries/Saturno.VSCode.FancyLib/Source/AboutPage/AboutModel";

// -----------------------------------------------------------------------------
export const ABOUT_SPEC: AboutSpec = {
  fallbackName: "Saturno FancyComments",
  fallbackDescription: "Create customized comments without formatting everything manually.",

  // The grid is the other Saturno products, so FancyComments shows
  // FancyHeader here exactly where FancyHeader shows FancyComments.
  moreSoftware: [
    {
      iconFile: "presskit-diy.png",
      name: "presskit.diy",
      description: "Amazing presskits in minutes.",
      repositoryUrl: "https://github.com/SaturnoSoftware/presskit.diy",
    },
    {
      iconFile: "gosh.webp",
      name: "Gosh",
      description: "Bookmarks for your shell.",
      repositoryUrl: "https://github.com/SaturnoSoftware/gosh",
    },
    {
      iconFile: "fancy-header.png",
      name: "Fancy Header",
      description: "Standardize your file headers with reusable templates.",
      repositoryUrl: "https://github.com/SaturnoSoftware/Saturno.VSCode.FancyHeader",
    },
  ],
};
