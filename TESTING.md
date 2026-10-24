# Verification

## Source

Run `npm run check`. It parses all shipped JavaScript, checks script references and bundled preset metadata, and rejects default demo audio.

## Browser flow

- Start with no audio, no cover and blank names; play/export remain disabled until an audio file is loaded.
- Upload a portrait, landscape or square image using the **background** upload control. Confirm a centered 16:9 crop, correct thumbnail and light animation.
- Preserve original colors, then disable preservation and pick a scene color. Cover art and logo remain independent.
- Replace the background, switch to a preset and back, then remove it. Repeat after a decode error or a cancelled picker; the last valid background should remain usable.
- Upload audio and wait for waveform analysis. Export MP4 with sound, entrance/exit and a non-default resolution.
- Check export history and opening the completed video.

## Windows

Build from a clean source tree. Run the extraction self-test and a native smoke export using an external `audio.wav` fixture. The regular application must not ship a test recording. Native Direct3D rendering needs compatible NVIDIA hardware; CI checks compilation but cannot prove GPU export performance.

## This local release

Browser and native export results for custom backgrounds are kept outside source control under `output/playwright/v33/`. No user media or generated exports are included in the GitHub source pack.

Validated locally: private and clean-public browser flows passed (portrait 800×1200 cropped to 800×450, original-color preservation and recoloring, moving-light pixel change, replacement/removal and invalid-image recovery). Both Windows builds exported a three-second H.264/AAC fixture at 1600×900 and 37fps through Direct3D11/NVENC with no audio playback. A clean WebView2 NuGet restore and portable MSVC build also passed.


## Background upload and scrolling regression (v35)

With the app served locally and a Playwright CLI browser session open:

```sh
npx --yes --package @playwright/cli playwright-cli -s=reference open http://127.0.0.1:8765/
npx --yes --package @playwright/cli playwright-cli -s=reference run-code --filename tests/background-scroll.js
```

The test generates its own portrait PNG, simulates returned file-picker focus, verifies that the outer workspace remains at scrollTop 0, verifies the worker path and aspect-preserving crop, scrolls the settings back to the top, then removes the texture. No private fixture is required.

Locally, the actual file chooser was also exercised with a 6000×8000 JPEG. Before the fix, the hidden outer workspace scrolled by 402px and could not be restored by wheel scrolling; after the fix it stayed at 0. Worker preparation took approximately 377ms with 37 UI timer ticks and a maximum 11ms tick gap on the test machine. Rapid replacement cancelled the previous worker; invalid images kept the last valid background. Mobile page scrolling was also checked.


## Release 1.00: Arabic / English

Run `tests/language-switch.js` with the same Playwright CLI `run-code --filename` workflow. It verifies both directions, translation of animation/export options and placeholders, saved language preference, and unchanged user-entered Arabic/English values. `npm run check` also validates that every static translation key exists in the English locale and that the displayed version is 1.00.

The English export summary, custom background status, history, narrow-screen layout and language persistence were checked locally. Native smoke reports named with `enlang` switch the Windows caption, dialogs, errors and notifications to English through the native language bridge. These smoke tests use their own WebView2 profile, not the user's profile.

Release 1.00 source and Windows build validation passed: all 251 English strings have static-key coverage; browser language/scroll regression tests passed in the clean public package; native Windows English and Arabic custom-background exports passed at 1600×900 / 37fps with H.264/AAC and no audio playback. Native English bridge returned the title "Qaseeda Template" and product file metadata reports "1.00".

## Public release: external FFmpeg

Run `powershell -ExecutionPolicy Bypass -File tests/ffmpeg-discovery.ps1` on Windows. It checks bundled, environment-variable, adjacent-executable, saved-path and PATH discovery, rejection of relative configured paths, and missing-dependency behavior without opening dialogs. It creates temporary placeholders without executing them and does not alter the user's environment or FFmpeg installation.

A clean `-ExternalFFmpeg` public build was also tested locally with `QASEEDA_FFMPEG` set to a separately installed binary. A three-second custom-background fixture exported H.264/AAC at 1600×900 / 37fps through Direct3D11/NVENC in approximately 1.2 seconds, without playback; history, notification and open/reveal commands passed. This is a local hardware result, not a speed guarantee or a claim that GitHub Actions has already run. Before publishing, also check the interactive first-export file picker on a fresh Windows account and test the fallback path on non-NVIDIA hardware.
