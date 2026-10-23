using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Media;
using System.Windows.Forms;
internal sealed partial class NativeExport {
 internal sealed class ExportRecord {public string id,name,path,createdAt;public long bytes;public int width,height,fps;public double duration;public bool exists;public bool historySaved=true;}
 readonly List<ExportRecord> transientHistory=new List<ExportRecord>();NotifyIcon exportNotification;Timer notificationTimer;string notifiedExport;Dictionary<string,object> exportMetadata;
 string HistoryFile {get{return Path.Combine(testFolder??storage,"export-history.json");}}
 List<ExportRecord> ReadHistory(){try{return transientHistory.Concat(json.Deserialize<List<ExportRecord>>(File.ReadAllText(HistoryFile))??new List<ExportRecord>()).ToList();}catch{return new List<ExportRecord>(transientHistory);}}
 object History(){var records=ReadHistory();foreach(var entry in records)entry.exists=File.Exists(entry.path);return records;}
 ExportRecord CompleteExport(string file,Dictionary<string,object> metadata){
  var entry=new ExportRecord{id=Guid.NewGuid().ToString("N"),name=Path.GetFileName(file),path=Path.GetFullPath(file),createdAt=DateTime.UtcNow.ToString("o"),bytes=new FileInfo(file).Length,width=Convert.ToInt32(metadata["width"]),height=Convert.ToInt32(metadata["height"]),fps=Convert.ToInt32(metadata["fps"]),duration=Convert.ToDouble(metadata["duration"]),exists=true};
  var records=ReadHistory();records.Insert(0,entry);if(records.Count>100)records.RemoveRange(100,records.Count-100);
  string pending=HistoryFile+"."+Guid.NewGuid().ToString("N")+".tmp";
  try{File.WriteAllText(pending,json.Serialize(records),new System.Text.UTF8Encoding(false));if(File.Exists(HistoryFile))File.Replace(pending,HistoryFile,null);else File.Move(pending,HistoryFile);transientHistory.Clear();}catch{entry.historySaved=false;transientHistory.Insert(0,entry);}finally{try{if(File.Exists(pending))File.Delete(pending);}catch{}}
  if(testFolder==null){try{SystemSounds.Asterisk.Play();if(exportNotification==null){exportNotification=new NotifyIcon{Icon=owner.Icon,Text=L("قالب قصيدة")};exportNotification.BalloonTipClicked+=(s,e)=>{try{OpenExport(notifiedExport,false);}catch{}};notificationTimer=new Timer{Interval=12000};notificationTimer.Tick+=(s,e)=>{notificationTimer.Stop();exportNotification.Visible=false;};}notifiedExport=entry.id;exportNotification.Visible=true;exportNotification.ShowBalloonTip(5000,L("اكتمل التصدير"),entry.name+L("\nاضغط لفتح الفيديو."),ToolTipIcon.Info);notificationTimer.Stop();notificationTimer.Start();}catch{}}
  return entry;
 }
 object OpenExport(string id,bool reveal){
  var entry=ReadHistory().FirstOrDefault(item=>item.id==id);if(entry==null)throw new InvalidOperationException(L("هذا الملف غير موجود في سجل التصدير."));
  if(!File.Exists(entry.path))throw new FileNotFoundException(L("تعذّر العثور على الفيديو. ربما نُقل أو حُذف."));
  string extension=Path.GetExtension(entry.path).ToLowerInvariant();if(extension!=".mp4"&&extension!=".webm")throw new InvalidOperationException(L("نوع الملف غير مدعوم."));
  if(testFolder==null){if(reveal)Process.Start(new ProcessStartInfo("explorer.exe","/select,\""+entry.path+"\""){UseShellExecute=true});else Process.Start(new ProcessStartInfo(entry.path){UseShellExecute=true});}
  return new{opened=true};
 }
 void DisposeNotifications(){if(notificationTimer!=null)notificationTimer.Dispose();if(exportNotification!=null)exportNotification.Dispose();}
}
