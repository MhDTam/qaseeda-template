# Contributing

Arabic and English contributions are welcome. Discuss substantial behavior changes in an issue first. Fork the repository, create a focused branch, and open a pull request describing the problem and result.

Use Node.js 20.11+ for `npm run check`. Build requirements are in [docs/BUILD.md](docs/BUILD.md). There are no runtime npm dependencies and no `npm install` step.

Keep Arabic UI text in logical Unicode order and use existing Thmanyah/system font fallbacks. Scene changes must match both the Canvas/WebGL preview and the Direct3D exporter. Keep exports offline: no audio playback is needed during Windows export.

Before opening a pull request, run the source checks and test a custom image upload, color preservation, replacement/removal, audio upload, and one video export. Do not commit user media, exported files, SDK caches or build output. Include a screenshot when changing visible UI.

UI translations belong in `locales/en.js` and native dialog translations in `desktop/Localization.cs`. Preserve logical Unicode order and test both RTL and LTR layouts. User-entered text must never be translated.

Keep discussions respectful and technical. Do not post private recordings or personal information. Only contribute material you have permission to share. Unless explicitly stated otherwise, submitted original contributions are offered under this project's MIT license; retain third-party attribution and licenses.
