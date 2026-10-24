# Prepare and publish

From the working tree, run:

```sh
npm run check
npm run package:source
```

`publish/github/` is an explicit allowlist of code, documentation, licenses and build inputs. The exporter replaces private reference textures/video/motion with original code-generated presets and a periodic light atlas. It also removes the embedded Thmanyah font and retains system-font fallbacks. Existing user uploads, recordings, SDK caches, binaries and test exports are excluded. It does not contact GitHub. `.public-source.json` records the allowed public files; `npm run check` validates these and rejects personal paths, reference audio/video and embedded font data.

Open the generated directory and run `npm run check` again. A Windows build from this clean directory is recommended before publishing.

## Create a repository

Create an empty GitHub repository named `qaseeda-template`. If using the source ZIP, extract it into a new folder first and run the following commands from that extracted `qaseeda-template` folder. Otherwise use the generated directory. Replace the owner with your own account:

```sh
git init -b main
git add .
git commit -m "Initial public source release"
git remote add origin https://github.com/YOUR-ACCOUNT/qaseeda-template.git
git push -u origin main
```

The supplied `.github/workflows/ci.yml` checks JavaScript/source data and compiles the Windows host and native renderer. Issue forms, a pull-request template and monthly GitHub Actions dependency updates are included. Enable private vulnerability reporting in repository settings. Add a repository description and topics such as `audio-visualizer`, `arabic`, `video-editor`, `windows`, `webview2` and `nvenc`.

## Executable releases

Public releases use **separately installed FFmpeg**. Do not upload a private build containing reference media, an embedded proprietary font or a bundled FFmpeg binary. The public app asks for the user's FFmpeg path on first export when it cannot locate an installed copy.

Build and package from a committed, clean public checkout:

```powershell
./desktop/Build.ps1 -ExternalFFmpeg
./scripts/package-release.ps1
```

The packager verifies payload extraction, version, absence of bundled FFmpeg, reference audio/video and embedded font, then produces a Windows portable ZIP, source ZIP and SHA-256 checksums in `release/distribution/`. Git archives committed source; commit intended changes before packaging. Put these files in GitHub Releases, not in Git history.

For automated packaging, run **Build release candidate** from the Actions page. It uploads a downloadable artifact without publishing a release. Once the checks and a real export test pass, create the release tag:

```sh
git tag -a v1.01 -m "Qaseeda Template 1.01"
git push origin v1.01
```

The tag workflow builds the public executable and creates a **draft** GitHub Release with ZIP files, checksums and bilingual notes. Review the assets and notes, test on a clean Windows machine, and publish the draft in GitHub. Workflow execution on GitHub is only verified after pushing the repository; local builds are not evidence of a successful Actions run.

Use a release tag such as `v1.01`. The displayed product version is 1.01; the standard assembly/package version is 1.0.1. Both languages ship in the same executable. `package.json` is private to prevent accidental npm publication.
