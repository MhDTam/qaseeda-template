param([string]$Destination = (Join-Path $PSScriptRoot '../release/Nagham-v7/native'))
$ErrorActionPreference='Stop'
$version='1.0.4258.31'
$expected='56F7F4B8BF9AEE4B8EFEFBBDD4F67D5F74EBD1B100ED0806DA71BF76AF481AA9'
$cache=Join-Path $PSScriptRoot 'deps'
$package=Join-Path $cache 'WebView2.nupkg'
New-Item -ItemType Directory -Path $cache,$Destination -Force | Out-Null
if (!(Test-Path -LiteralPath $package)) {
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 Invoke-WebRequest -UseBasicParsing -Uri "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$version/microsoft.web.webview2.$version.nupkg" -OutFile $package
}
if ((Get-FileHash -LiteralPath $package -Algorithm SHA256).Hash -ne $expected) { throw 'WebView2 package checksum mismatch. Remove desktop/deps/WebView2.nupkg and restore again.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[IO.Compression.ZipFile]::OpenRead($package)
try {
 $entries=@{
  'lib/net462/Microsoft.Web.WebView2.Core.dll'='Microsoft.Web.WebView2.Core.dll'
  'lib/net462/Microsoft.Web.WebView2.WinForms.dll'='Microsoft.Web.WebView2.WinForms.dll'
  'build/native/x64/WebView2Loader.dll'='WebView2Loader.dll'
  'LICENSE.txt'='WebView2-License.txt'
 }
 foreach($source in $entries.Keys) {
  $entry=$archive.GetEntry($source)
  if (!$entry) { throw "Missing package entry: $source" }
  [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,(Join-Path $Destination $entries[$source]),$true)
 }
} finally { $archive.Dispose() }
