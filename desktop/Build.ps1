param(
 [string]$FFmpegPath=$env:QASEEDA_FFMPEG,
 [string]$OutputDirectory=(Join-Path $PSScriptRoot '../release'),
 [switch]$SkipFFmpeg,
 [switch]$ExternalFFmpeg
)
$ErrorActionPreference='Stop'
$buildRoot=Split-Path -Parent $PSScriptRoot
$payload=Join-Path $OutputDirectory 'Nagham-v7'
$native=Join-Path $payload 'native'
New-Item -ItemType Directory -Path $payload,$native,(Join-Path $payload 'assets') -Force | Out-Null
$files=@('index.html','styles.css','app.js','scene-renderer.js','custom-background.js','background-worker.js','i18n.js','editor-options.js','export-history.js','export-frame-packer.js','native-scene-export.js','README.md','README.en.md','README.ar.md','CHANGELOG.md','TESTING.md','Start.cmd','LICENSE','THIRD_PARTY_NOTICES.md')
foreach($file in $files) { Copy-Item -LiteralPath (Join-Path $buildRoot $file) -Destination $payload -Force }
foreach($file in @('template-data.js','thmanyah.css','app-icon.png','app-icon-preview.png','app-background.svg','Thmanyah-License.pdf')) {
 Copy-Item -LiteralPath (Join-Path $buildRoot "assets/$file") -Destination (Join-Path $payload 'assets') -Force
}
Copy-Item -LiteralPath (Join-Path $buildRoot 'licenses') -Destination $payload -Recurse -Force
Copy-Item -LiteralPath (Join-Path $buildRoot 'locales') -Destination $payload -Recurse -Force
Copy-Item -LiteralPath (Join-Path $buildRoot 'docs') -Destination $payload -Recurse -Force
& (Join-Path $PSScriptRoot 'Restore-Dependencies.ps1') -Destination $native
if (!$SkipFFmpeg -and !$ExternalFFmpeg) {
 if (!$FFmpegPath) { $FFmpegPath=Join-Path $native 'ffmpeg.exe' }
 if (!(Test-Path -LiteralPath $FFmpegPath)) { throw 'Supply -FFmpegPath <path/to/ffmpeg.exe> or set QASEEDA_FFMPEG. See docs/BUILD.md.' }
 if ([IO.Path]::GetFullPath($FFmpegPath) -ne [IO.Path]::GetFullPath((Join-Path $native 'ffmpeg.exe'))) { Copy-Item -LiteralPath $FFmpegPath -Destination (Join-Path $native 'ffmpeg.exe') -Force }
 Copy-Item -LiteralPath (Join-Path $buildRoot 'licenses/FFmpeg-License.txt') -Destination $native -Force
 Copy-Item -LiteralPath (Join-Path $buildRoot 'licenses/FFmpeg-Build.txt') -Destination $native -Force
} else {
 $bundledFFmpeg=Join-Path $native 'ffmpeg.exe'
 if(Test-Path -LiteralPath $bundledFFmpeg){Remove-Item -LiteralPath $bundledFFmpeg -Force}
 if($ExternalFFmpeg){Write-Host 'Public build: FFmpeg is installed separately and selected on first export.'}
 else{Write-Warning 'CI compilation only: FFmpeg is not included.'}
}
& (Join-Path $PSScriptRoot 'native-renderer/Build.ps1') -OutputDirectory $native
$zip=Join-Path $OutputDirectory 'payload.zip'
Compress-Archive -Path (Join-Path $payload '*') -DestinationPath $zip -Force
$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (!(Test-Path -LiteralPath $compiler)) { throw '.NET Framework 4.8 is required.' }
$arguments=@('/nologo','/target:winexe','/platform:x64','/optimize+',('/out:'+(Join-Path $OutputDirectory 'Nagham.exe')),('/win32icon:'+(Join-Path $PSScriptRoot 'Qaseeda.ico')),('/resource:'+$zip+',Nagham.Payload.zip'),'/reference:System.Windows.Forms.dll','/reference:System.IO.Compression.dll','/reference:System.Drawing.dll','/reference:System.Web.Extensions.dll',('/reference:'+(Join-Path $native 'Microsoft.Web.WebView2.Core.dll')),('/reference:'+(Join-Path $native 'Microsoft.Web.WebView2.WinForms.dll')))
$sources=@('NaghamLauncher.cs','NativeExport.cs','NativeSceneExport.cs','ExportHistory.cs','ScreenColorPicker.cs','Localization.cs','FFmpegLocator.cs') | ForEach-Object { Join-Path $PSScriptRoot $_ }
& $compiler @arguments @sources
if($LASTEXITCODE -ne 0){throw 'EXE build failed'}
Copy-Item -LiteralPath (Join-Path $OutputDirectory 'Nagham.exe') -Destination (Join-Path $OutputDirectory 'QaseedaTemplate.exe') -Force
Write-Host "Built: $(Join-Path $OutputDirectory 'QaseedaTemplate.exe')"
