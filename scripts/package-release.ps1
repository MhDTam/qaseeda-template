param([string]$BuildDirectory=(Join-Path $PSScriptRoot '../release'),[string]$SourceArchive)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$version=(Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).displayVersion
$payload=Join-Path $BuildDirectory 'Nagham-v7'
if(Test-Path -LiteralPath (Join-Path $payload 'native/ffmpeg.exe')){throw 'Public releases use separately installed FFmpeg. Rebuild with -ExternalFFmpeg.'}
$template=[IO.File]::ReadAllText((Join-Path $payload 'assets/template-data.js'))
if($template -match 'data:(?:video|audio)/'){throw 'Private reference media found in payload. Build from the clean public source.'}
if([IO.File]::ReadAllText((Join-Path $payload 'assets/thmanyah.css')) -match 'base64'){throw 'Embedded proprietary font found.'}
$exe=Join-Path $BuildDirectory 'QaseedaTemplate.exe'
if((Get-Item -LiteralPath $exe).VersionInfo.ProductVersion -ne $version){throw 'Executable and package version differ.'}
$report=Join-Path $BuildDirectory 'release-self-test.txt'
if(Test-Path -LiteralPath $report){Remove-Item -LiteralPath $report}
$process=Start-Process -FilePath $exe -ArgumentList @('--self-test',('"'+$report+'"')) -PassThru -WindowStyle Hidden
if(!$process.WaitForExit(60000)){Stop-Process -Id $process.Id;throw 'Packaged host self-test timed out'}
if($process.ExitCode -ne 0 -or !(Test-Path $report) -or !(Select-String -LiteralPath $report -SimpleMatch 'Ready=True')){throw 'Packaged host self-test failed'}
$out=Join-Path $BuildDirectory 'distribution'
$stage=Join-Path $BuildDirectory "portable-$version"
New-Item -ItemType Directory -Path $out,$stage -Force | Out-Null
Copy-Item -LiteralPath $exe -Destination (Join-Path $stage "QaseedaTemplate-$version.exe") -Force
foreach($file in @('LICENSE','THIRD_PARTY_NOTICES.md','docs/RELEASE_NOTES_1.00.md')){Copy-Item -LiteralPath (Join-Path $root $file) -Destination $stage -Force}
Copy-Item -LiteralPath (Join-Path $root 'licenses') -Destination $stage -Recurse -Force
$portable=Join-Path $out "QaseedaTemplate-$version-windows-x64.zip"
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $portable -Force
$source=Join-Path $out "qaseeda-template-$version-source.zip"
# Git archives committed source only; never include ignored release/dependency folders.
if($SourceArchive){Copy-Item -LiteralPath $SourceArchive -Destination $source -Force}
else{
 & git -C $root archive --format=zip --prefix=qaseeda-template/ --output=$source HEAD
 if($LASTEXITCODE -ne 0){throw 'Commit the prepared source before packaging a GitHub release, or supply the prepared source ZIP with -SourceArchive.'}
}
$setup=Join-Path $out "QaseedaTemplate-$version-Setup.exe"
$assets=@($portable,$source)
if(Test-Path -LiteralPath $setup){$assets+= $setup}
$checks=$assets | ForEach-Object { (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLower()+'  '+[IO.Path]::GetFileName($_) }
[IO.File]::WriteAllLines((Join-Path $out "SHA256SUMS-$version.txt"),$checks,(New-Object Text.UTF8Encoding($false)))
Write-Host "Release files: $out"
