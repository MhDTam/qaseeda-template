using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
internal sealed partial class NativeExport:IDisposable {
 readonly CoreWebView2Environment environment;CoreWebView2SharedBuffer sharedFrame;byte[] frameBytes;static Task<string> hardwareProbe;
 readonly Form owner;readonly CoreWebView2 web;readonly string root,storage,testFolder;
 readonly JavaScriptSerializer json=new JavaScriptSerializer{MaxJsonLength=int.MaxValue};
 Process encoder;Task<string> errors;string folder,audioPath,partial,target;bool active;
 internal NativeExport(Form window,CoreWebView2 browser,string package,string data,string test,CoreWebView2Environment env){environment=env;owner=window;english=((StudioWindow)window).English;web=browser;root=package;storage=data;testFolder=test;web.WebMessageReceived+=Receive;}
 async Task<string> FindHardware(){
  string ffmpeg=ResolveFFmpeg(false);if(ffmpeg==null)return "libx264";
  if(hardwareProbe==null)hardwareProbe=Task.Run(()=>{
   foreach(string codec in new[]{"h264_nvenc","h264_qsv","h264_amf"}){
    try{using(var probe=new Process{StartInfo=new ProcessStartInfo(ResolveFFmpeg(false),"-hide_banner -loglevel error -f lavfi -i color=c=black:s=1280x720:r=25 -frames:v 2 -c:v "+codec+" -f null NUL"){UseShellExecute=false,CreateNoWindow=true,RedirectStandardError=true}}){probe.Start();var log=probe.StandardError.ReadToEndAsync();if(!probe.WaitForExit(10000)){probe.Kill();continue;}if(probe.ExitCode==0)return codec;}}
    catch{}
   }return "libx264";
  });
  return await hardwareProbe;
 }
 void Reply(string id,object result,string error){if(owner.IsDisposed||owner.Disposing)return;web.PostWebMessageAsJson(json.Serialize(new{nativeExport=true,id=id,result=result,error=error}));}
 async void Receive(object sender,CoreWebView2WebMessageReceivedEventArgs e){
  string id=null;
  try{
   if(!String.Equals(new Uri(e.Source).LocalPath,Path.Combine(root,"index.html"),StringComparison.OrdinalIgnoreCase))return;
   var message=json.Deserialize<Dictionary<string,object>>(e.WebMessageAsJson);
   if(!message.ContainsKey("nativeExport"))return;
   id=(string)message["id"];string command=(string)message["command"];if(command=="language"){string selected=(string)message["language"];if(selected!="ar"&&selected!="en")throw new ArgumentException("Invalid language.");english=selected=="en";((StudioWindow)owner).SetLanguage(english);if(testFolder==null)try{File.WriteAllText(Path.Combine(storage,"language.txt"),selected);}catch{}Reply(id,new{language=selected,title=owner.Text},null);return;}
   if(command=="pickColor"||command=="chooseColor"){await Task.Yield();if(testFolder!=null){Reply(id,new{color="#3080a0"},null);return;}if(command=="pickColor"){using(var picker=new ScreenColorPicker(english)){picker.ShowDialog(owner);Reply(id,new{color=picker.PickedColor},picker.Failure);}}else{using(var picker=new System.Windows.Forms.ColorDialog{FullOpen=true,Color=System.Drawing.ColorTranslator.FromHtml((string)message["color"])} ){string picked=picker.ShowDialog(owner)==DialogResult.OK?"#"+picker.Color.R.ToString("x2")+picker.Color.G.ToString("x2")+picker.Color.B.ToString("x2"):null;Reply(id,new{color=picked},null);}}return;}if(command=="history"){Reply(id,History(),null);return;}if(command=="openExport"||command=="revealExport"){try{Reply(id,OpenExport((string)message["recordId"],command=="revealExport"),null);}catch(Exception ex){Reply(id,null,ex.Message);}return;}if(command=="capabilities"){if(ResolveFFmpeg(true)==null){Reply(id,new{cancelled=true},null);return;}Reply(id,new{nativeScene=await NativeSceneSupported()},null);return;}if(command=="scene"){await RenderScene(message,e,id);return;}if(command=="begin"){
    if(active)throw new InvalidOperationException(L("هناك تصدير جارٍ بالفعل."));
    if(ResolveFFmpeg(true)==null){Reply(id,new{cancelled=true},null);return;}
    exportMetadata=message;string format=(string)message["format"];if(format!="mp4"&&format!="webm")throw new InvalidDataException();
    int width=Convert.ToInt32(message["width"]),height=Convert.ToInt32(message["height"]),fps=Convert.ToInt32(message["fps"]);
    if(width<320||width>3840||height<180||height>2160||fps<1||fps>60)throw new InvalidDataException();
    double duration=Convert.ToDouble(message["duration"],CultureInfo.InvariantCulture);if(duration<=0||Double.IsInfinity(duration)||Double.IsNaN(duration))throw new InvalidDataException();
    if(testFolder!=null)target=Path.Combine(testFolder,"native-export."+format);
    else using(var dialog=new SaveFileDialog{Title=L("حفظ الفيديو"),FileName=(string)message["name"]+"."+format,Filter=format.ToUpper()+"|*."+format,OverwritePrompt=true}){if(dialog.ShowDialog(owner)!=DialogResult.OK){Reply(id,new{cancelled=true},null);return;}target=dialog.FileName;}
    folder=Path.Combine(storage,"Exports",Guid.NewGuid().ToString("N"));Directory.CreateDirectory(folder);
    audioPath=Path.Combine(folder,"source.audio");string audioTransfer="embedded";
    CoreWebView2File sourceFile=null;try{if(e.AdditionalObjects.Count>0)sourceFile=e.AdditionalObjects[0] as CoreWebView2File;}catch{}
    if(sourceFile!=null&&!String.IsNullOrEmpty(sourceFile.Path)){string source=sourceFile.Path;await Task.Run(()=>File.Copy(source,audioPath,false));audioTransfer="file";}
    else await Task.Run(()=>File.WriteAllBytes(audioPath,Convert.FromBase64String((string)message["audio"])));
    string[] backgrounds=null;
    if(message.ContainsKey("backgroundVideo")){
     string clip=Path.Combine(folder,"background.mp4");await Task.Run(()=>File.WriteAllBytes(clip,Convert.FromBase64String((string)message["backgroundVideo"])));
     int bgWidth=Math.Min(width,1920),bgHeight=bgWidth*9/16;
     using(var decoder=new Process{StartInfo=new ProcessStartInfo(ResolveFFmpeg(false),"-y -hide_banner -loglevel error -i \""+clip+"\" -an -vf scale="+bgWidth+":"+bgHeight+" -q:v 2 \""+Path.Combine(folder,"background-%06d.jpg")+"\""){UseShellExecute=false,CreateNoWindow=true,RedirectStandardError=true}}){decoder.Start();var log=decoder.StandardError.ReadToEndAsync();await Task.Run(()=>decoder.WaitForExit());if(decoder.ExitCode!=0)throw new Exception(await log);}
     string[] files=Directory.GetFiles(folder,"background-*.jpg");Array.Sort(files);backgrounds=new string[files.Length];
     await Task.Run(()=>{for(int i=0;i<files.Length;i++)backgrounds[i]="data:image/jpeg;base64,"+Convert.ToBase64String(File.ReadAllBytes(files[i]));});
    }
    partial=Path.Combine(Path.GetDirectoryName(target),".qaseeda-"+Guid.NewGuid().ToString("N")+"."+format);
    string quality=(string)message["quality"],crf=quality=="master"?"12":quality=="maximum"?"16":quality=="standard"?"23":quality=="economy"?"28":"19";
    string codec=format=="mp4"?await FindHardware():"libvpx-vp9";
    string hardware=codec=="h264_nvenc"?"-c:v h264_nvenc -preset p4 -rc vbr -cq "+crf+" -b:v 0 -pix_fmt yuv420p":codec=="h264_qsv"?"-c:v h264_qsv -preset veryfast -global_quality "+crf:codec=="h264_amf"?"-c:v h264_amf -quality speed -rc cqp -qp_i "+crf+" -qp_p "+crf:null;
    string video=hardware??(format=="mp4"?"-c:v libx264 -preset veryfast -crf "+crf+" -pix_fmt yuv420p":"-c:v libvpx-vp9 -deadline realtime -cpu-used 8 -row-mt 1 -b:v "+Convert.ToInt32(message["bitrate"]));
    if(quality=="custom"){int requested=Convert.ToInt32(message["bitrate"]);if(requested<1000000||requested>150000000)throw new InvalidDataException();video="-c:v "+codec+(codec=="h264_nvenc"?" -preset p4 -rc vbr":codec=="libx264"?" -preset veryfast":codec=="libvpx-vp9"?" -deadline realtime -cpu-used 8 -row-mt 1":"")+" -b:v "+requested+" -pix_fmt yuv420p";}string audio=format=="mp4"?"-c:a aac -b:a 256k -movflags +faststart":"-c:a libopus -b:a 256k";
    bool raw=false;string pixelFormat=message.ContainsKey("pixelFormat")&&(string)message["pixelFormat"]=="nv12"?"nv12":"rgba";int frameSize=pixelFormat=="nv12"?width*height*3/2:width*height*4;
    try{sharedFrame=environment.CreateSharedBuffer((ulong)frameSize);frameBytes=new byte[frameSize];web.PostSharedBufferToScript(sharedFrame,CoreWebView2SharedBufferAccess.ReadWrite,"{\"qaseedaFrames\":true}");raw=true;}catch{if(sharedFrame!=null)sharedFrame.Dispose();sharedFrame=null;frameBytes=null;}
    string input=raw?"-f rawvideo -pixel_format "+pixelFormat+" -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -video_size "+width+"x"+height+" -framerate "+fps:"-f image2pipe -framerate "+fps+" -vcodec mjpeg";
    string arguments="-y -hide_banner -loglevel error "+input+" -i pipe:0 -i \""+audioPath+"\" -map 0:v:0 -map 1:a:0 "+video+" "+audio+" -t "+duration.ToString("0.######",CultureInfo.InvariantCulture)+" \""+partial+"\"";
    encoder=new Process{StartInfo=new ProcessStartInfo(ResolveFFmpeg(false),arguments){UseShellExecute=false,CreateNoWindow=true,RedirectStandardInput=true,RedirectStandardError=true}};
    encoder.Start();errors=encoder.StandardError.ReadToEndAsync();active=true;Reply(id,new{ready=true,backgrounds=backgrounds,shared=raw,encoder=codec,audioTransfer=audioTransfer},null);
   }else if(command=="frame"){
    if(!active)throw new InvalidOperationException(L("التصدير غير نشط."));
    byte[] frame;if(sharedFrame!=null){frame=frameBytes;Marshal.Copy(sharedFrame.Buffer,frame,0,frame.Length);}else frame=Convert.FromBase64String((string)message["image"]);await encoder.StandardInput.BaseStream.WriteAsync(frame,0,frame.Length);Reply(id,new{accepted=true},null);
   }else if(command=="finish"){
    if(!active)throw new InvalidOperationException(L("التصدير غير نشط."));
    encoder.StandardInput.Close();await Task.Run(()=>encoder.WaitForExit());string diagnostic=await errors;
    if(encoder.ExitCode!=0)throw new Exception(L("تعذّر ترميز الفيديو: ")+diagnostic);
    if(File.Exists(target))File.Delete(target);File.Move(partial,target);partial=null;Cleanup(false);var entry=CompleteExport(target,exportMetadata);Reply(id,new{saved=true,entry=entry},null);
   }else if(command=="cancel"){if(sceneCancel!=null)CancelScene();else Cleanup(true);Reply(id,new{cancelled=true},null);}
  }catch(Exception ex){Cleanup(true);if(id!=null)Reply(id,null,ex.Message);}
 }
 void Cleanup(bool kill){active=false;if(sharedFrame!=null){sharedFrame.Dispose();sharedFrame=null;}frameBytes=null;if(encoder!=null){try{if(kill&&!encoder.HasExited)encoder.Kill();}catch{}encoder.Dispose();encoder=null;}if(partial!=null&&File.Exists(partial)){try{File.Delete(partial);}catch{}}partial=null;if(audioPath!=null&&File.Exists(audioPath)){try{File.Delete(audioPath);}catch{}}if(folder!=null&&Directory.Exists(folder)){try{foreach(string file in Directory.GetFiles(folder))File.Delete(file);Directory.Delete(folder,false);}catch{}}folder=audioPath=null;}
 public void Dispose(){web.WebMessageReceived-=Receive;DisposeScene();DisposeNotifications();Cleanup(true);}
}
