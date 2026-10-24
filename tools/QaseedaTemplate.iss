#ifndef AppVersion
  #define AppVersion "1.00"
#endif

[Setup]
AppId={{C74239E0-9697-484F-A88A-826E5A09D101}
AppName=Qaseeda Template
AppVersion={#AppVersion}
AppVerName=Qaseeda Template {#AppVersion}
AppPublisher=MhDTam
AppPublisherURL=https://github.com/MhDTam/qaseeda-template
AppSupportURL=https://github.com/MhDTam/qaseeda-template/issues
AppUpdatesURL=https://github.com/MhDTam/qaseeda-template/releases
DefaultDirName={localappdata}\Programs\QaseedaTemplate
DefaultGroupName=Qaseeda Template
PrivilegesRequired=lowest
SetupArchitecture=x64
MinVersion=10.0.17763
WizardStyle=modern
SetupIconFile=..\desktop\Qaseeda.ico
UninstallDisplayIcon={app}\QaseedaTemplate.exe
LicenseFile=..\LICENSE
Compression=lzma2/max
SolidCompression=yes
ArchiveExtraction=basic
OutputDir=..\release\distribution
OutputBaseFilename=QaseedaTemplate-{#AppVersion}-Setup
CloseApplications=yes

[Tasks]
Name: "ffmpeg"; Description: "Download FFmpeg for video export (about 34 MB)"; Flags: checkedonce

[Files]
Source: "..\release\installer-stage\QaseedaTemplate.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\release\installer-stage\MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\THIRD_PARTY_NOTICES.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\licenses\InnoSetup-License.txt"; DestDir: "{app}\licenses"; Flags: ignoreversion
Source: "..\licenses\FFmpeg-License.txt"; DestDir: "{app}\licenses"; Flags: ignoreversion
Source: "..\licenses\FFmpeg-Build.txt"; DestDir: "{app}\licenses"; Flags: ignoreversion

[Icons]
Name: "{group}\Qaseeda Template"; Filename: "{app}\QaseedaTemplate.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\QaseedaTemplate.exe"; Description: "Launch Qaseeda Template"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: files; Name: "{app}\ffmpeg.exe"

[Code]
const
  WebView2Key = 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  FFmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.7z';
  FFmpegHash = '4705843ccaaf54257c16ad90f3e952ece33c17df964ecf7bfdbb0f49c7171077';

function HasWebView2: Boolean;
var
  Version: String;
begin
  Result := (RegQueryStringValue(HKCU, WebView2Key, 'pv', Version) and
             (Version <> '') and (Version <> '0.0.0.0')) or
            (RegQueryStringValue(HKLM32, WebView2Key, 'pv', Version) and
             (Version <> '') and (Version <> '0.0.0.0')) or
            (RegQueryStringValue(HKLM64, WebView2Key, 'pv', Version) and
             (Version <> '') and (Version <> '0.0.0.0'));
end;

function HasFFmpeg: Boolean;
var
  ResultCode: Integer;
  Selected: String;
begin
  Result := FileExists(ExpandConstant('{app}\ffmpeg.exe'));
  if Result then Exit;
  Selected := GetEnv('QASEEDA_FFMPEG');
  if (Selected <> '') and FileExists(Selected) then begin
    Result := True;
    Exit;
  end;
  Result := Exec(ExpandConstant('{sys}\where.exe'), 'ffmpeg.exe', '',
                 SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

procedure InstallWebView2;
var
  ResultCode: Integer;
begin
  if HasWebView2 then Exit;
  WizardForm.StatusLabel.Caption := 'Installing Microsoft WebView2 Runtime...';
  if not Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'),
              '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) or
     (ResultCode <> 0) or not HasWebView2 then
    MsgBox('WebView2 could not be installed automatically. Install it from Microsoft, then start Qaseeda Template again.',
           mbError, MB_OK);
end;

procedure InstallFFmpeg;
var
  Stage, Source: String;
begin
  if not WizardIsTaskSelected('ffmpeg') or HasFFmpeg then Exit;
  WizardForm.StatusLabel.Caption := 'Downloading FFmpeg for video export...';
  try
    DownloadTemporaryFile(FFmpegUrl, 'ffmpeg-9.0.2-essentials_build.7z', FFmpegHash, nil);
    Stage := ExpandConstant('{tmp}\ffmpeg-stage');
    ExtractArchive(ExpandConstant('{tmp}\ffmpeg-9.0.2-essentials_build.7z'),
                   Stage, '', True, nil);
    Source := Stage + '\ffmpeg-9.0.2-essentials_build\bin\ffmpeg.exe';
    if not FileExists(Source) or
       not CopyFile(Source, ExpandConstant('{app}\ffmpeg.exe'), False) then
      RaiseException('FFmpeg executable was not found in the verified archive.');
  except
    MsgBox('FFmpeg could not be downloaded. Qaseeda is installed, but video export will ask you to select ffmpeg.exe later.' +
           Chr(13) + Chr(10) + GetExceptionMessage, mbError, MB_OK);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then begin
    InstallWebView2;
    InstallFFmpeg;
  end;
end;
