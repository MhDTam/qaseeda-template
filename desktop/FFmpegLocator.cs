using System;
using System.IO;
using System.Windows.Forms;

internal sealed partial class NativeExport {
 string ffmpegExecutable;
 string ResolveFFmpeg(bool choose){
  if(ffmpegExecutable!=null&&File.Exists(ffmpegExecutable))return ffmpegExecutable;
  string saved=null;try{saved=File.ReadAllText(Path.Combine(storage,"ffmpeg-path.txt")).Trim();}catch{}
  string beside=Path.GetDirectoryName(Application.ExecutablePath);
  foreach(string candidate in new[]{Path.Combine(root,"native","ffmpeg.exe"),Environment.GetEnvironmentVariable("QASEEDA_FFMPEG"),Path.Combine(beside,"ffmpeg.exe"),saved})
   if(!String.IsNullOrWhiteSpace(candidate)&&Path.IsPathRooted(candidate)&&File.Exists(candidate))return ffmpegExecutable=Path.GetFullPath(candidate);
  foreach(string directory in (Environment.GetEnvironmentVariable("PATH")??"").Split(Path.PathSeparator)){
   try{string candidate=Path.Combine(directory.Trim().Trim('"'),"ffmpeg.exe");if(Path.IsPathRooted(candidate)&&File.Exists(candidate))return ffmpegExecutable=Path.GetFullPath(candidate);}catch{}
  }
  if(!choose)return null;
  if(testFolder!=null)throw new FileNotFoundException("FFmpeg is required for native export. Set QASEEDA_FFMPEG to its absolute executable path.");
  using(var dialog=new OpenFileDialog{Title=english?"Select ffmpeg.exe to enable video export (saved for future use)":"اختر ffmpeg.exe لتفعيل تصدير الفيديو (يُحفظ للمرة القادمة)",Filter="FFmpeg|ffmpeg.exe",CheckFileExists=true,Multiselect=false}){
   if(dialog.ShowDialog(owner)!=DialogResult.OK)return null;
   ffmpegExecutable=Path.GetFullPath(dialog.FileName);File.WriteAllText(Path.Combine(storage,"ffmpeg-path.txt"),ffmpegExecutable);hardwareProbe=null;nativeSceneProbe=null;return ffmpegExecutable;
  }
 }
}
