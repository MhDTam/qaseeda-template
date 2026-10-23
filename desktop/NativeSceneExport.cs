using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
internal sealed partial class NativeExport {
 CancellationTokenSource sceneCancel;Process sceneProcess;static Task<bool> nativeSceneProbe;string sceneWorkFolder,sceneWorkPartial;
 async Task<bool> NativeSceneSupported(){
  if(!File.Exists(Path.Combine(root,"native","QaseedaRenderer.exe"))||await FindHardware()!="h264_nvenc")return false;
  if(nativeSceneProbe==null)nativeSceneProbe=Task.Run(()=>{string probeFile=Path.Combine(storage,"scene-probe-"+Guid.NewGuid().ToString("N")+".h264");try{using(var process=new Process{StartInfo=new ProcessStartInfo(Path.Combine(root,"native","QaseedaRenderer.exe"),"--probe \""+probeFile+"\""){UseShellExecute=false,CreateNoWindow=true,RedirectStandardError=true}}){process.Start();var log=process.StandardError.ReadToEndAsync();if(!process.WaitForExit(10000)){process.Kill();return false;}return process.ExitCode==0;}}catch{return false;}finally{try{if(File.Exists(probeFile))File.Delete(probeFile);}catch{}}});
  return await nativeSceneProbe;
 }
 void CancelScene(){if(sceneCancel!=null){sceneCancel.Cancel();try{if(sceneProcess!=null&&!sceneProcess.HasExited)sceneProcess.Kill();}catch{}}}
 void DisposeScene(){CancelScene();try{if(sceneProcess!=null)sceneProcess.WaitForExit(2000);}catch{}try{if(sceneWorkPartial!=null&&File.Exists(sceneWorkPartial))File.Delete(sceneWorkPartial);if(sceneWorkFolder!=null&&Directory.Exists(sceneWorkFolder)){foreach(string file in Directory.GetFiles(sceneWorkFolder))File.Delete(file);Directory.Delete(sceneWorkFolder,false);}}catch{}}
 async Task RunSceneProcess(string exe,string arguments,CancellationToken token,Action<string> progress){
  token.ThrowIfCancellationRequested();
  using(var process=new Process{StartInfo=new ProcessStartInfo(exe,arguments){UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true}}){
   sceneProcess=process;process.Start();var diagnostic=process.StandardError.ReadToEndAsync();
   string line;while((line=await process.StandardOutput.ReadLineAsync())!=null){if(progress!=null)progress(line);}
   await Task.Run(()=>process.WaitForExit());string error=await diagnostic;sceneProcess=null;token.ThrowIfCancellationRequested();if(process.ExitCode!=0)throw new Exception(error);
  }
 }
 async Task RenderScene(Dictionary<string,object> message,CoreWebView2WebMessageReceivedEventArgs eventArgs,string id){
  if(active){Reply(id,null,L("هناك تصدير جارٍ بالفعل."));return;}
  string job=null,scenePartial=null,sceneTarget=null;var watch=Stopwatch.StartNew();
  try{
   var scene=(Dictionary<string,object>)message["scene"];int width=Convert.ToInt32(scene["width"]),height=Convert.ToInt32(scene["height"]),fps=Convert.ToInt32(scene["fps"]);double duration=Convert.ToDouble(scene["duration"]);
   if(width%2!=0||height%2!=0||width<320||width>3840||height<180||height>2160||fps<1||fps>60||duration<=0||Double.IsInfinity(duration)||Double.IsNaN(duration))throw new InvalidDataException();
   if((string)scene["quality"]=="custom"){int bitrate=Convert.ToInt32(scene["bitrate"]);if(bitrate<1000000||bitrate>150000000)throw new InvalidDataException();}if(testFolder!=null)sceneTarget=Path.Combine(testFolder,"native-export.mp4");
   else using(var dialog=new SaveFileDialog{Title=L("حفظ الفيديو"),FileName=(string)message["name"]+".mp4",Filter="MP4|*.mp4",OverwritePrompt=true}){if(dialog.ShowDialog(owner)!=DialogResult.OK){Reply(id,new{cancelled=true},null);return;}sceneTarget=dialog.FileName;}
   active=true;sceneCancel=new CancellationTokenSource();var token=sceneCancel.Token;
   job=Path.Combine(storage,"Exports",Guid.NewGuid().ToString("N"));Directory.CreateDirectory(job);sceneWorkFolder=job;scenePartial=Path.Combine(Path.GetDirectoryName(sceneTarget),".qaseeda-"+Guid.NewGuid().ToString("N")+".mp4");sceneWorkPartial=scenePartial;
   string inputAudio=Path.Combine(job,"source.audio"),audioTransfer="embedded";CoreWebView2File sourceFile=null;try{if(eventArgs.AdditionalObjects.Count>0)sourceFile=eventArgs.AdditionalObjects[0] as CoreWebView2File;}catch{}
   if(sourceFile!=null&&!String.IsNullOrEmpty(sourceFile.Path)){string source=sourceFile.Path;await Task.Run(()=>File.Copy(source,inputAudio,false));audioTransfer="file";}else await Task.Run(()=>File.WriteAllBytes(inputAudio,Convert.FromBase64String((string)message["audio"])));
   token.ThrowIfCancellationRequested();var assets=(Dictionary<string,object>)message["assets"];
   foreach(string key in new[]{"overlay","control","photo","glyphs","logo","backgroundImage","light"})if(assets.ContainsKey(key)){string file=Path.Combine(job,key+".png"),bytes=(string)assets[key];await Task.Run(()=>File.WriteAllBytes(file,Convert.FromBase64String(bytes)));scene[key]=file;token.ThrowIfCancellationRequested();}
   string ffmpeg=ResolveFFmpeg(false);
   if((string)scene["background"]=="original"){
    string clip=Path.Combine(job,"background.mp4");await Task.Run(()=>File.WriteAllBytes(clip,Convert.FromBase64String((string)assets["backgroundVideo"])));token.ThrowIfCancellationRequested();
    await RunSceneProcess(ffmpeg,"-y -hide_banner -loglevel error -i \""+clip+"\" -an -q:v 2 \""+Path.Combine(job,"background-%06d.jpg")+"\"",token,null);
    string[] frames=Directory.GetFiles(job,"background-*.jpg");Array.Sort(frames);if(frames.Length==0)throw new Exception(L("تعذّر تجهيز الخلفية."));scene["originalFrames"]=frames;scene["originalDuration"]=frames.Length/25.0;
   }
   token.ThrowIfCancellationRequested();string sceneJson=Path.Combine(job,"scene.json"),h264=Path.Combine(job,"scene.h264");File.WriteAllText(sceneJson,json.Serialize(scene),new System.Text.UTF8Encoding(false));double renderSeconds=0;if(testFolder!=null)File.WriteAllText(Path.Combine(testFolder,"scene-debug.json"),json.Serialize(scene));
   await RunSceneProcess(Path.Combine(root,"native","QaseedaRenderer.exe"),"\""+sceneJson+"\" \""+h264+"\"",token,line=>{try{var update=json.Deserialize<Dictionary<string,object>>(line);if(update.ContainsKey("frame"))web.PostWebMessageAsJson(json.Serialize(new{nativeSceneProgress=true,frame=update["frame"],total=update["total"]}));if(update.ContainsKey("seconds"))renderSeconds=Convert.ToDouble(update["seconds"]);}catch{}});
   await RunSceneProcess(ffmpeg,"-y -hide_banner -loglevel error -r "+fps+" -f h264 -i \""+h264+"\" -i \""+inputAudio+"\" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -t "+duration.ToString("0.######",CultureInfo.InvariantCulture)+" -movflags +faststart \""+scenePartial+"\"",token,null);
   token.ThrowIfCancellationRequested();if(File.Exists(sceneTarget))File.Replace(scenePartial,sceneTarget,null);else File.Move(scenePartial,sceneTarget);scenePartial=sceneWorkPartial=null;var entry=CompleteExport(sceneTarget,scene);Reply(id,new{saved=true,entry=entry,seconds=watch.Elapsed.TotalSeconds,renderSeconds=renderSeconds,frames=(int)Math.Ceiling(duration*fps),audioTransfer=audioTransfer},null);
  }catch(OperationCanceledException){Reply(id,new{cancelled=true},null);}catch(Exception ex){Reply(id,null,ex.Message);}
  finally{active=false;sceneProcess=null;if(sceneCancel!=null){sceneCancel.Dispose();sceneCancel=null;}if(scenePartial!=null&&File.Exists(scenePartial))try{File.Delete(scenePartial);}catch{}if(job!=null&&Directory.Exists(job))try{foreach(string file in Directory.GetFiles(job))File.Delete(file);Directory.Delete(job,false);}catch{}sceneWorkFolder=sceneWorkPartial=null;}
 }
}
