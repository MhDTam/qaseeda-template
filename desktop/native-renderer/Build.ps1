param([string]$OutputDirectory = (Join-Path $PSScriptRoot '../../release/Nagham-v7/native'))
$ErrorActionPreference = 'Stop'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (!(Test-Path -LiteralPath $vswhere)) { throw 'Install Visual Studio 2022 Build Tools with Desktop development with C++ and a Windows SDK.' }
$vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (!$vs) { throw 'Visual C++ x64 tools were not found.' }
$vc = Get-ChildItem -LiteralPath (Join-Path $vs 'VC/Tools/MSVC') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$kits = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots' -ErrorAction SilentlyContinue).KitsRoot10
if (!$kits) { $kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits/10' }
$sdk = Get-ChildItem -LiteralPath (Join-Path $kits 'Include') -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'um/Windows.h') } | Sort-Object Name -Descending | Select-Object -First 1
if (!$sdk) { throw 'A Windows 10/11 SDK is required.' }
$savedPath=$env:PATH; $savedInclude=$env:INCLUDE; $savedLib=$env:LIB
try {
 $env:PATH = (Join-Path $vc.FullName 'bin/Hostx64/x64')+';'+$env:PATH
 $env:INCLUDE = "$($vc.FullName)/include;$($sdk.FullName)/ucrt;$($sdk.FullName)/shared;$($sdk.FullName)/um;$($sdk.FullName)/winrt"
 $env:LIB = "$($vc.FullName)/lib/x64;$kits/Lib/$($sdk.Name)/ucrt/x64;$kits/Lib/$($sdk.Name)/um/x64"
 New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
 & (Join-Path $vc.FullName 'bin/Hostx64/x64/cl.exe') /nologo /DNOMINMAX /std:c++17 /EHsc /O2 /MT /utf-8 ("/Fo:"+(Join-Path $OutputDirectory 'renderer.obj')) ("/Fe:"+(Join-Path $OutputDirectory 'QaseedaRenderer.exe')) (Join-Path $PSScriptRoot 'main.cpp') /link d3d11.lib dxgi.lib d3dcompiler.lib windowscodecs.lib ole32.lib
 if ($LASTEXITCODE -ne 0) { throw 'Native renderer build failed.' }
 Remove-Item -LiteralPath (Join-Path $OutputDirectory 'renderer.obj') -ErrorAction SilentlyContinue
 Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'scene.hlsl') -Destination $OutputDirectory -Force
} finally { $env:PATH=$savedPath; $env:INCLUDE=$savedInclude; $env:LIB=$savedLib }
