# Fancy family Marketplace asset specification

Status: local specification for FancyComments and FancyHeader. Drive changes and Marketplace publication are not part of this change.

## Purpose

Use one repeatable export and review standard for both VS Code extensions while keeping each product's icon and demonstrations distinct. This specification separates Microsoft requirements from Saturno recommendations. A recommendation is not represented as an official Marketplace limit.

## Verified product baseline

- Both package manifests point to `Resources/icons/icon.png`.
- Both local icon exports measured 256 x 256 pixels, 8-bit RGBA PNG on 2026-10-14.
- Both manifests currently use `galleryBanner.color` `#1F2937` and `galleryBanner.theme` `dark`.
- The Drive source tree has separate `FANCY_COMMENTS` and `FANCY_HEADER` folders, each with `ASSETS` and `COPY` folders.
- Drive also has capture folders under `Clips_Videos_Prints` and a legacy `_EXPORT/final` folder. The current captures and exports have not been approved or dimension-checked by this task.
- The READMEs contain screenshot links and display dimensions, but those HTML dimensions do not establish the original raster dimensions.

## Official VS Code requirements

Sources: [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) and [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest). The source excerpts and retrieval metadata are in `_SATURNO_BRAIN/RAW/vscode-marketplace-assets/`.

- The manifest icon is a PNG and must be at least 128 x 128 pixels. Microsoft calls out 256 x 256 pixels for Retina displays.
- `vsce` rejects an SVG extension icon. SVG README images are also rejected unless they come from an approved badge provider.
- README and changelog image URLs must use HTTPS.
- Marketplace presentation guidance recommends an icon, a contrasting `galleryBanner.color`, and an appropriate dark or light banner text theme.
- The fetched Microsoft pages do not define screenshot dimensions, GIF duration or size, video codec, or a Marketplace video-embedding contract. Treat the following media settings as Saturno house recommendations only.

## Saturno export recommendations

| Asset | House recommendation | Delivery and review |
| --- | --- | --- |
| Extension icon | Square 256 x 256 PNG, sRGB, RGBA. Preserve the product's approved artwork and its intended alpha/background treatment. Keep the editable PSD master separate from the PNG export. | The code export remains `Resources/icons/icon.png`. Check dimensions and appearance at small sizes and against light and dark UI surfaces. Do not change the artwork or banner color as part of a technical export. |
| Marketplace screenshots | 1280 x 720 pixels, 16:9, static PNG, sRGB, opaque. Keep code text readable at half-size. Use real product UI, one primary action per image, and no unrelated desktop or private information. | Use one to three screenshots per product. Every README image must have concise English alt text that describes visible content, not the filename. Use a stable HTTPS URL, or a repository-relative URL only when its resolved asset is publicly accessible. Never use a private Drive URL in Marketplace copy. |
| Demo master | MP4, H.264, 1280 x 720, 30 fps, up to 30 seconds, target no more than 25 MB. Avoid narration unless accurate captions are included. | Preserve the master in Drive. Confirm the playback and content before approving it. The fetched Marketplace pages do not document direct video embedding. |
| Optional animated preview | Optimized GIF, 960 x 540 or smaller, 12 to 15 fps, up to 12 seconds, target no more than 10 MB, with a deliberate loop. | Derive it from the approved demo master. Embed it in Marketplace README only after checking the actual package preview and live Marketplace rendering. A GIF is not a substitute for the MP4 master. |

These pixel, duration, frame-rate, and size values are internal targets, not platform validation rules. If an actual Marketplace render or publishing check disagrees, preserve the master and adjust only the derived export.

## File naming

Use lowercase ASCII and hyphens for new exported files. Keep the existing package icon filename unchanged.

| Asset | Naming pattern |
| --- | --- |
| Editable icon source in each product folder | `icon.psd` |
| Icon export in each product folder | `icon.png` |
| Marketplace screenshot | `<product>-marketplace-<sequence>-<scenario>-<locale>.png` |
| Demo master | `<product>-demo-<sequence>-<locale>-master.mp4` |
| Optional animated preview | `<product>-demo-<sequence>-<locale>-preview.gif` |

Use `fancy-comments` or `fancy-header` for `<product>`. Use a two-digit sequence and a BCP 47 language tag such as `en` or `pt-BR`. The scenario identifies the visible feature. Avoid generic names such as `1.png`, `final.png`, or `new.gif`.

## Alt text rules

- Add an `alt` value to every README image, including animated previews.
- Describe the visible extension action and result in one short sentence.
- Do not claim a setting, command, or capability that the image does not show.
- Match the alt text language to the asset locale. Keep product names and command labels exact when they are visible.
- Review alt text together with the image. Do not infer image content from a filename alone.

## Drive organization

Existing editable sources stay in their product folders. Existing captures remain untouched until an authorized normalization task reviews and approves them.

```text
FANCY_COMMENTS/ASSETS/icon.psd
FANCY_COMMENTS/ASSETS/icon.png
FANCY_COMMENTS/COPY/README.md
FANCY_HEADER/ASSETS/icon.psd
FANCY_HEADER/ASSETS/icon.png
FANCY_HEADER/COPY/README.md
Clips_Videos_Prints/Fancy Comments/       capture candidates; not implicitly approved
Clips_Videos_Prints/Fancy Header/         capture candidates; not implicitly approved
_EXPORT/FancyComments/Marketplace/screenshots/
_EXPORT/FancyComments/Marketplace/video/
_EXPORT/FancyHeader/Marketplace/screenshots/
_EXPORT/FancyHeader/Marketplace/video/
```

The product-specific `_EXPORT` subfolders above are proposed canonical destinations and were not present in the 2026-10-14 listing. The existing `_EXPORT/final` files are legacy candidates; do not rename or move them under this specification. Creating folders, copying files, renaming files, changing permissions, or sharing any Drive item requires the separate authorization applicable to that operation.

## Export manifest and approval

Before an asset is treated as final, record its product, filename, source file, pixel dimensions, format, byte size, locale, alt text, intended channel, review date, and approval status in an asset manifest beside the export. Measure the binary itself; Drive list metadata alone does not prove dimensions, alpha, GIF frame count, or duration.

Review each candidate at full size and at Marketplace display scale. Verify that code is legible, the selected product is unmistakable, no credentials or personal data appear, alt text matches the image, and the final HTTPS or repository-relative image resolves publicly. Record approval explicitly; folder location, filename, or an existing GIF does not imply approval.

## Scope boundary

This file defines a local standard only. It does not modify Drive assets, upload or share files, publish a Marketplace listing, select new brand artwork, or authorize a release. Apply the Drive layout in a separate authorized task. The current candidate files still need dimension, duration, content, alt-text, and approval review before use.
