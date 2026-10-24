param(
 [string]$BuildDirectory=(Join-Path $PSScriptRoot '../release'),
 [string]$IsccPath,
 [string]$WebView2BootstrapperPath
)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$build=[IO.Path]::GetFullPath($BuildDirectory)
$version=(Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).displayVersion
$exe=Join-Path $build 'QaseedaTemplate.exe'
if(!(Test-Path -LiteralPath $exe)){throw 'Build QaseedaTemplate.exe before packaging the installer.'}
if((Get-Item -LiteralPath $exe).VersionInfo.ProductVersion -ne $version){throw 'App and installer versions differ.'}

$toolRoot=Join-Path $build 'inno-tool'
New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
if(!$IsccPath){
 $innoDir=Join-Path $toolRoot 'installed'
 $IsccPath=Join-Path $innoDir 'ISCC.exe'
 if(!(Test-Path -LiteralPath $IsccPath)){
  $innoInstaller=Join-Path $toolRoot 'innosetup-7.1.0-x64.exe'
  Invoke-WebRequest -Uri 'https://github.com/jrsoftware/issrc/releases/download/is-7_1_0/innosetup-7.1.0-x64.exe' -OutFile $innoInstaller
  $expected='0362a383ed217d4c4239b5933866dd96d3eb2102737da92f80f6057a4b40df2f'
  if((Get-FileHash -LiteralPath $innoInstaller -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected){throw 'Inno Setup download checksum mismatch.'}
  $installed=Start-Process -FilePath $innoInstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/CURRENTUSER','/NOICONS',("/DIR="+$innoDir)) -Wait -PassThru -WindowStyle Hidden
  if($installed.ExitCode -ne 0 -or !(Test-Path -LiteralPath $IsccPath)){throw "Inno Setup installation failed: $($installed.ExitCode)"}
 }
}
if(!(Test-Path -LiteralPath $IsccPath)){throw 'ISCC.exe not found.'}

if(!$WebView2BootstrapperPath){
 $WebView2BootstrapperPath=Join-Path $toolRoot 'MicrosoftEdgeWebview2Setup.exe'
 Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $WebView2BootstrapperPath
}
if(!(Test-Path -LiteralPath $WebView2BootstrapperPath)){throw 'WebView2 bootstrapper not found.'}
$signature=Get-AuthenticodeSignature -LiteralPath $WebView2BootstrapperPath
if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch '(^|,\s*)O=Microsoft Corporation(,|$)'){
 throw 'WebView2 bootstrapper must have a valid Microsoft signature.'
}

$stage=Join-Path $root 'release/installer-stage'
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item -LiteralPath $exe -Destination (Join-Path $stage 'QaseedaTemplate.exe') -Force
Copy-Item -LiteralPath $WebView2BootstrapperPath -Destination (Join-Path $stage 'MicrosoftEdgeWebview2Setup.exe') -Force
$out=Join-Path $root 'release/distribution'
New-Item -ItemType Directory -Path $out -Force | Out-Null
& $IsccPath "/DAppVersion=$version" (Join-Path $PSScriptRoot 'QaseedaTemplate.iss')
if($LASTEXITCODE -ne 0){throw "Inno Setup compilation failed: $LASTEXITCODE"}
$setup=Join-Path $out "QaseedaTemplate-$version-Setup.exe"
if(!(Test-Path -LiteralPath $setup)){throw 'Setup.exe not produced.'}
$hash=(Get-FileHash -LiteralPath $setup -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$setup.sha256","$hash  $([IO.Path]::GetFileName($setup))`n",(New-Object Text.UTF8Encoding($false)))
Write-Host "Installer: $setup"
