# Windows build

## Required tools

- Windows 10/11 x64; Visual Studio 2022 Build Tools with **Desktop development with C++**, x64 compiler and a Windows 10/11 SDK.
- .NET Framework 4.8 (the framework C# compiler is used).
- A static x64 FFmpeg executable with `h264_nvenc`, `h264_qsv`, `h264_amf`, `libx264`, `libvpx-vp9`, AAC, MP4 and WebM support only for local FFmpeg export tests. See the [publisher build list](https://www.gyan.dev/ffmpeg/builds/).
- Internet on first build to restore Microsoft.Web.WebView2 1.0.4258.31 from NuGet. The package SHA-256 is pinned in `desktop/Restore-Dependencies.ps1`.

No personal paths or compiler version numbers are hard-coded. The build discovers Visual Studio with `vswhere` and the installed SDK. It restores the managed .NET 4.6.2-compatible WebView2 assemblies and the x64 native loader.

```powershell
./desktop/Build.ps1 -ExternalFFmpeg
```

This is the public release build. FFmpeg is not bundled in the app: it checks `QASEEDA_FFMPEG` (absolute path), beside the application executable, a previously saved selection, and PATH. If needed, it asks the user to choose `ffmpeg.exe` on the first export. Selection is stored in `%LOCALAPPDATA%/Nagham/ffmpeg-path.txt`. The online installer can download and place a verified FFmpeg executable beside the app; the portable ZIP still requires a manual copy or selection. Previewing and image export do not require FFmpeg.

Outputs go to `release/`; set `-OutputDirectory` for an isolated build. For a private build with bundled FFmpeg, supply `-FFmpegPath 'C:\Tools\ffmpeg\bin\ffmpeg.exe'` or set `QASEEDA_FFMPEG` at build time. A subsequent default build can reuse `release/Nagham-v7/native/ffmpeg.exe`. Public release packaging rejects bundled FFmpeg to keep its redistribution separate.

`release/QaseedaTemplate.exe` embeds the web application, native renderer and runtime dependencies. It extracts a versioned payload into `%LOCALAPPDATA%/Nagham/Versions/` when launched. User history and WebView2 state remain in local app data. A signed executable is not produced by these scripts.

Before redistributing a different FFmpeg build, replace the FFmpeg build/source notices with those matching the exact binary you supply. Keep `licenses/` with the application. FFmpeg and WebView2 are separate third-party components, not relicensed under MIT.

To create the online installer after the public executable is built:

```powershell
./tools/package-installer.ps1
```

The script verifies the Microsoft signature on the WebView2 bootstrapper, uses a pinned Inno Setup compiler, and produces `release/distribution/QaseedaTemplate-1.00-Setup.exe`. During installation, WebView2 Runtime is installed only if absent. FFmpeg is an optional checked task; the installer downloads Gyan FFmpeg 9.0.2 essentials directly to the user's machine and checks its SHA-256 before copying `ffmpeg.exe` beside the app. The setup needs internet when these components are missing. Use `-BuildDirectory` for an isolated build.

## CI and validation

```powershell
./desktop/Build.ps1 -SkipFFmpeg
```

This is a **compile-only CI artifact**, not a distributable application. The GitHub workflow validates C++ and C# compilation and payload extraction without an NVIDIA GPU or a bundled FFmpeg binary. Real GPU export must be tested on supported hardware.

```powershell
./release/QaseedaTemplate.exe --self-test "$PWD/release/self-test.txt"
```

For full native smoke tests, create a separate output directory containing `audio.wav`, then launch the executable with `--smoke-test <absolute-report.json>`. This writes test exports beside the report and skips desktop dialogs/notifications. Never put fixtures or reports in the release bundle.
