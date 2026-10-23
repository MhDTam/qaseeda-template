$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$scratch=Join-Path ([IO.Path]::GetTempPath()) ('qaseeda-ffmpeg-test-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratch -Force | Out-Null
$harness=@'
using System;
using System.IO;
using System.Windows.Forms;
internal sealed partial class NativeExport {
 readonly string root,storage,testFolder;
 readonly Form owner=null; readonly bool english=true;
 static object hardwareProbe,nativeSceneProbe;
 NativeExport(string package,string data){root=package;storage=data;testFolder=data;}
 static void Equal(string actual,string expected){if(actual!=expected)throw new Exception("Discovery mismatch: "+actual+" != "+expected);}
 static int Main(){
  string home=AppDomain.CurrentDomain.BaseDirectory,package=Path.Combine(home,"package"),data=Path.Combine(home,"data"),tools=Path.Combine(home,"tools");
  string native=Path.Combine(package,"native"),bundle=Path.Combine(native,"ffmpeg.exe"),external=Path.Combine(tools,"ffmpeg.exe"),adjacent=Path.Combine(home,"ffmpeg.exe"),saved=Path.Combine(data,"ffmpeg-path.txt");
  Directory.CreateDirectory(native);Directory.CreateDirectory(data);Directory.CreateDirectory(tools);
  try{
   Environment.SetEnvironmentVariable("PATH","");Environment.SetEnvironmentVariable("QASEEDA_FFMPEG",null);
   Equal(new NativeExport(package,data).ResolveFFmpeg(false),null);
   File.WriteAllText(external,"");Environment.SetEnvironmentVariable("QASEEDA_FFMPEG",external);
   Equal(new NativeExport(package,data).ResolveFFmpeg(false),external);
   File.WriteAllText(bundle,"");Equal(new NativeExport(package,data).ResolveFFmpeg(false),bundle);File.Delete(bundle);
   Environment.SetEnvironmentVariable("QASEEDA_FFMPEG",null);File.WriteAllText(adjacent,"");
   Equal(new NativeExport(package,data).ResolveFFmpeg(false),adjacent);File.Delete(adjacent);
   File.WriteAllText(saved,external);Equal(new NativeExport(package,data).ResolveFFmpeg(false),external);File.Delete(saved);
   Environment.SetEnvironmentVariable("PATH","relative-path;\""+tools+"\"");Equal(new NativeExport(package,data).ResolveFFmpeg(false),external);
   Environment.SetEnvironmentVariable("PATH","");Environment.SetEnvironmentVariable("QASEEDA_FFMPEG","relative-path/ffmpeg.exe");
   Equal(new NativeExport(package,data).ResolveFFmpeg(false),null);
   bool rejected=false;try{new NativeExport(package,data).ResolveFFmpeg(true);}catch(FileNotFoundException){rejected=true;}
   if(!rejected)throw new Exception("Missing dependency should fail unattended testing without showing a dialog.");
   Console.WriteLine("FFmpeg discovery passed: bundled, environment, adjacent, saved, PATH, relative-path rejection, missing dependency.");return 0;
  }finally{
   foreach(string file in new[]{bundle,external,adjacent,saved})if(File.Exists(file))File.Delete(file);
   foreach(string directory in new[]{native,package,data,tools})if(Directory.Exists(directory))Directory.Delete(directory);
  }
 }
}
'@
try{
 $source=Join-Path $scratch 'DiscoveryTest.cs'
 [IO.File]::WriteAllText($source,$harness,(New-Object Text.UTF8Encoding($false)))
 $exe=Join-Path $scratch 'DiscoveryTest.exe'
 & "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319/csc.exe" /nologo /target:exe /reference:System.Windows.Forms.dll "/out:$exe" $source (Join-Path $root 'desktop/FFmpegLocator.cs')
 if($LASTEXITCODE -ne 0){throw 'Test compilation failed'}
 & $exe
 if($LASTEXITCODE -ne 0){throw 'FFmpeg discovery failed'}
}finally{
 foreach($file in @('DiscoveryTest.cs','DiscoveryTest.exe')){ $target=Join-Path $scratch $file;if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target} }
 if(Test-Path -LiteralPath $scratch){Remove-Item -LiteralPath $scratch}
}
