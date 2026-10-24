using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
[assembly:AssemblyTitle("قالب قصيدة")]
[assembly:AssemblyProduct("قالب قصيدة")]
[assembly:AssemblyDescription("تصميم مقاطع القصائد الصوتية")]
[assembly:AssemblyCompany("MhDTam")]
[assembly:AssemblyCopyright("Copyright (c) 2026 MhDTam")]
[assembly:AssemblyVersion("1.0.1.0")]
[assembly:AssemblyFileVersion("1.0.1.0")]
[assembly:AssemblyInformationalVersion("1.01")]
internal static class Program {
 internal static string Root;
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr LoadLibrary(string file);
 [STAThread] static int Main(string[] args){try{
  string data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Nagham");byte[] payload;
  using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("Nagham.Payload.zip"))using(var memory=new MemoryStream()){stream.CopyTo(memory);payload=memory.ToArray();}
  string hash;using(var sha=SHA256.Create()){hash=BitConverter.ToString(sha.ComputeHash(payload)).Replace("-","").Substring(0,16);}Root=Path.Combine(data,"Versions",hash);
  if(!File.Exists(Path.Combine(Root,"complete"))){Directory.CreateDirectory(Root);string safe=Path.GetFullPath(Root)+Path.DirectorySeparatorChar;using(var memory=new MemoryStream(payload))using(var zip=new ZipArchive(memory,ZipArchiveMode.Read))foreach(var entry in zip.Entries){string file=Path.GetFullPath(Path.Combine(Root,entry.FullName.Replace('/',Path.DirectorySeparatorChar)));if(!file.StartsWith(safe,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Invalid package.");if(String.IsNullOrEmpty(entry.Name)){Directory.CreateDirectory(file);continue;}Directory.CreateDirectory(Path.GetDirectoryName(file));using(var source=entry.Open())using(var output=File.Create(file))source.CopyTo(output);}File.WriteAllText(Path.Combine(Root,"complete"),"1.01");}
  AppDomain.CurrentDomain.AssemblyResolve+=(sender,e)=>{string dll=Path.Combine(Root,"native",new AssemblyName(e.Name).Name+".dll");return File.Exists(dll)?Assembly.LoadFrom(dll):null;};
  if(LoadLibrary(Path.Combine(Root,"native","WebView2Loader.dll"))==IntPtr.Zero)throw new Exception("تعذّر تحميل محرك العرض.");
  if(args.Length==2&&args[0]=="--self-test"){File.WriteAllLines(args[1],new[]{"Ready="+File.Exists(Path.Combine(Root,"index.html")),"Root="+Root,"Host=Native WebView2","PayloadSHA256="+hash});return 0;}
  return Run(data,args);
 }catch(Exception e){MessageBox.Show(e.Message,"قالب قصيدة",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}}
 [MethodImpl(MethodImplOptions.NoInlining)] static int Run(string data,string[] args){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new StudioWindow(Root,data,args.Length==2&&args[0]=="--smoke-test"?args[1]:null));return 0;}
}
internal sealed class StudioWindow:Form {
 readonly WebView2 web=new WebView2();readonly Panel caption=new StudioCaption();readonly string root,data,report;readonly StudioCaptionButton maximize;bool testing,done;NativeExport nativeExport;readonly Label captionTitle,captionSubtitle;internal bool English {get;private set;}
 [DllImport("user32.dll")] static extern bool ReleaseCapture();
 [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr handle,int message,IntPtr w,IntPtr l);
 internal StudioWindow(string folder,string storage,string diagnostics){root=folder;data=storage;report=diagnostics;testing=report!=null;try{English=!testing&&File.ReadAllText(Path.Combine(data,"language.txt")).Trim()=="en";}catch{}Text="قالب قصيدة";Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);FormBorderStyle=FormBorderStyle.None;StartPosition=FormStartPosition.CenterScreen;Size=new Size(1280,900);MinimumSize=new Size(900,650);BackColor=ColorTranslator.FromHtml("#F1E7D6");Padding=new Padding(1);Font=new Font("Segoe UI",10);MaximizedBounds=Screen.FromControl(this).WorkingArea;
  var layout=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=2,Margin=Padding.Empty,Padding=Padding.Empty};layout.RowStyles.Add(new RowStyle(SizeType.Absolute,54));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));Controls.Add(layout);
  caption.Dock=DockStyle.Fill;caption.BackColor=BackColor;caption.Margin=Padding.Empty;layout.Controls.Add(caption,0,0);
  var icon=new PictureBox{Image=Icon.ToBitmap(),SizeMode=PictureBoxSizeMode.Zoom,BackColor=Color.Transparent,Size=new Size(36,36),Location=new Point(17,8)};caption.Controls.Add(icon);
  captionTitle=new Label{Text="قالب قصيدة",ForeColor=ColorTranslator.FromHtml("#513614"),AutoSize=false,BackColor=Color.Transparent,Location=new Point(65,3),Size=new Size(200,28),TextAlign=ContentAlignment.MiddleLeft,Font=new Font("Segoe UI",11,FontStyle.Bold)};caption.Controls.Add(captionTitle);
  captionSubtitle=new Label{Text="استوديو القصائد الصوتية",ForeColor=ColorTranslator.FromHtml("#977951"),BackColor=Color.Transparent,Location=new Point(66,30),Size=new Size(220,19),Font=new Font("Segoe UI",8),TextAlign=ContentAlignment.MiddleLeft};caption.Controls.Add(captionSubtitle);
  var controls=new FlowLayoutPanel{Dock=DockStyle.Right,Width=150,FlowDirection=FlowDirection.LeftToRight,WrapContents=false,Margin=Padding.Empty,Padding=new Padding(0,8,8,0),BackColor=Color.Transparent};caption.Controls.Add(controls);controls.BringToFront();
  var minimize=CaptionButton("—");maximize=CaptionButton("□");var close=CaptionButton("×");controls.Controls.Add(minimize);controls.Controls.Add(maximize);controls.Controls.Add(close);minimize.Click+=(s,e)=>WindowState=FormWindowState.Minimized;maximize.Click+=(s,e)=>ToggleMaximize();close.Click+=(s,e)=>Close();
  MouseEventHandler drag=(s,e)=>{if(e.Button==MouseButtons.Left){ReleaseCapture();SendMessage(Handle,0xA1,new IntPtr(2),IntPtr.Zero);}};caption.MouseDown+=drag;captionTitle.MouseDown+=drag;icon.MouseDown+=drag;captionSubtitle.MouseDown+=drag;caption.DoubleClick+=(s,e)=>ToggleMaximize();captionTitle.DoubleClick+=(s,e)=>ToggleMaximize();Resize+=(s,e)=>{maximize.Text=WindowState==FormWindowState.Maximized?"❐":"□";maximize.Invalidate();};
  SetLanguage(English);
  web.Dock=DockStyle.Fill;web.Margin=Padding.Empty;web.DefaultBackgroundColor=BackColor;layout.Controls.Add(web,0,1);Shown+=async(s,e)=>await Initialize();FormClosed+=(s,e)=>{if(nativeExport!=null)nativeExport.Dispose();web.Dispose();};
 }
 internal void SetLanguage(bool english){English=english;Text=english?"Qaseeda Template":"قالب قصيدة";captionTitle.Text=Text;captionSubtitle.Text=english?"Audio visual studio · 1.01":"استوديو القصائد الصوتية · 1.01";foreach(Control container in caption.Controls)foreach(Control control in container.Controls){var button=control as StudioCaptionButton;if(button!=null)button.AccessibleName=button.Text=="×"?(english?"Close":"إغلاق"):button.Text=="—"?(english?"Minimize":"تصغير"):(english?"Maximize / restore":"تكبير واستعادة");}}
 StudioCaptionButton CaptionButton(string text){return new StudioCaptionButton{Text=text,AccessibleName=text=="×"?"إغلاق":text=="—"?"تصغير":"تكبير واستعادة",Width=44,Height=36,Margin=new Padding(2,0,0,0),TabStop=false};}
 void ToggleMaximize(){if(WindowState==FormWindowState.Normal){MaximizedBounds=Screen.FromControl(this).WorkingArea;WindowState=FormWindowState.Maximized;}else WindowState=FormWindowState.Normal;}
 protected override void WndProc(ref Message m){if(m.Msg==0x84&&WindowState==FormWindowState.Normal){long point=m.LParam.ToInt64();Point p=PointToClient(new Point((short)(point&0xffff),(short)((point>>16)&0xffff)));bool left=p.X<6,right=p.X>=ClientSize.Width-6,top=p.Y<6,bottom=p.Y>=ClientSize.Height-6;int hit=top?(left?13:right?14:12):bottom?(left?16:right?17:15):left?10:right?11:0;if(hit!=0){m.Result=new IntPtr(hit);return;}}base.WndProc(ref m);}
 async Task Initialize(){try{
  var environment=await CoreWebView2Environment.CreateAsync(null,(testing?Path.Combine(Path.GetDirectoryName(report),"WebViewProfile"):Path.Combine(data,"WebViewProfile")),new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required"));await web.EnsureCoreWebView2Async(environment);web.CoreWebView2.Settings.AreDefaultContextMenusEnabled=false;await web.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("window.NATIVE_EXPORT_AVAILABLE=true;window.QASEEDA_NATIVE_LANGUAGE='"+(English?"en":"ar")+"';");nativeExport=new NativeExport(this,web.CoreWebView2,root,data,testing?Path.GetDirectoryName(report):null,environment);
  web.CoreWebView2.DownloadStarting+=(s,e)=>{if(testing){e.ResultFilePath=Path.Combine(Path.GetDirectoryName(report),"native-export.mp4");e.Handled=true;return;}var deferral=e.GetDeferral();BeginInvoke(new Action(()=>{try{using(var dialog=new SaveFileDialog{Title=English?"Save exported file":"حفظ الملف المُصدّر",FileName=Path.GetFileName(e.ResultFilePath),Filter=English?"Exported file|*.*":"ملف مُصدّر|*.*",OverwritePrompt=true}){if(dialog.ShowDialog(this)==DialogResult.OK){e.ResultFilePath=dialog.FileName;e.Handled=true;}else e.Cancel=true;}}finally{deferral.Complete();}}));};
  if(testing)web.CoreWebView2.NavigationCompleted+=async(s,e)=>{if(done)return;done=true;await SmokeTest();};web.Source=new Uri(Path.Combine(root,"index.html"));
 }catch(Exception e){if(testing){File.WriteAllText(report,"ERROR: "+e);Close();}else MessageBox.Show(this,(English?"Could not start WebView2: ":"تعذّر بدء محرك WebView2: ")+e.Message,English?"Qaseeda Template":"قالب قصيدة",MessageBoxButtons.OK,MessageBoxIcon.Error);}}
 async Task SmokeTest(){try{


  if(report.Contains("long")&&!report.Contains("file")){string sample=Path.Combine(Path.GetDirectoryName(report),"audio.wav");await web.CoreWebView2.ExecuteScriptAsync("window.NAGHAM_TEMPLATE.audio='data:audio/wav;base64,"+Convert.ToBase64String(File.ReadAllBytes(sample))+"';document.getElementById('audio').src=window.NAGHAM_TEMPLATE.audio;document.getElementById('audio').load();");}

  string fixture=Path.Combine(Path.GetDirectoryName(report),"audio.wav");if(File.Exists(fixture))await web.CoreWebView2.ExecuteScriptAsync("document.getElementById('audio').src='data:audio/wav;base64,"+Convert.ToBase64String(File.ReadAllBytes(fixture))+"';document.getElementById('audio').load();");
  if(report.Contains("enlang"))await web.CoreWebView2.ExecuteScriptAsync("QaseedaI18n.setLanguage('en');window.languageCheck=null;nativeCall('language',{language:'en'}).then(x=>window.languageCheck=x);");
  bool ready=false;for(int i=0;i<180;i++){await Task.Delay(250);if(await web.CoreWebView2.ExecuteScriptAsync("typeof state !== 'undefined' && state.assetsReady && audio.duration>0")=="true"){ready=true;break;}}
  if(report.Contains("file")){
   var js=new System.Web.Script.Serialization.JavaScriptSerializer();
   var tree=js.Deserialize<System.Collections.Generic.Dictionary<string,object>>(await web.CoreWebView2.CallDevToolsProtocolMethodAsync("DOM.getDocument","{}"));
   var node=(System.Collections.Generic.Dictionary<string,object>)tree["root"];
   var query=js.Deserialize<System.Collections.Generic.Dictionary<string,object>>(await web.CoreWebView2.CallDevToolsProtocolMethodAsync("DOM.querySelector",js.Serialize(new{nodeId=Convert.ToInt32(node["nodeId"]),selector="#audioFile"})));
   await web.CoreWebView2.CallDevToolsProtocolMethodAsync("DOM.setFileInputFiles",js.Serialize(new{nodeId=Convert.ToInt32(query["nodeId"]),files=new[]{Path.Combine(Path.GetDirectoryName(report),"audio.wav")}}));
  }
  if(report.Contains("file"))for(int i=0;i<240;i++){await Task.Delay(250);if(await web.CoreWebView2.ExecuteScriptAsync("!!state.audioFile && audio.currentSrc===state.audioUrl && audio.readyState>0 && audio.duration>0")=="true")break;}
  await web.CoreWebView2.ExecuteScriptAsync("window.initialHistoryCount=exportRecords.length;");
  var info=await web.CoreWebView2.ExecuteScriptAsync("({ready:state.assetsReady,logo:!!document.getElementById('logoFile'),inputHeight:getComputedStyle(document.getElementById('artist')).height,inputLineHeight:getComputedStyle(document.getElementById('artist')).lineHeight,mediaRecorder:typeof MediaRecorder!=='undefined',mp4:MediaRecorder.isTypeSupported('video/mp4'),version:document.querySelector('.editor-tag').textContent})");
  using(var image=new Bitmap(caption.Width,caption.Height)){caption.DrawToBitmap(image,new Rectangle(0,0,image.Width,image.Height));image.Save(Path.ChangeExtension(report,"png"));}
  File.WriteAllText(report,"{\"nativeTitlebar\":\"champagne-gradient\",\"windowButtons\":3,\"web\":"+info+"}");
  if(ready){if(report.Contains("custom"))await web.CoreWebView2.ExecuteScriptAsync("document.getElementById('exportResolution').value='custom';document.getElementById('customWidth').value='1600';document.getElementById('exportFps').value='custom';document.getElementById('customFps').value='37';document.getElementById('exportQuality').value='custom';document.getElementById('customBitrate').value='8';document.getElementById('arabicFont').value='Tahoma';document.getElementById('latinFont').value='Thmanyah';document.getElementById('pickColor').click();updateExportSummary();");if(report.Contains("anim"))await web.CoreWebView2.ExecuteScriptAsync("document.getElementById('introToggle').checked=true;document.getElementById('entranceAnimation').value='original';document.getElementById('exitAnimation').value='iris';");if(report.Contains("custombg")){string background=Path.Combine(Path.GetDirectoryName(report),"background.png");await web.CoreWebView2.ExecuteScriptAsync("useCustomBackground(new File([Uint8Array.from(atob('"+Convert.ToBase64String(File.ReadAllBytes(background))+"'),c=>c.charCodeAt(0))],'background.png',{type:'image/png'}));");}if(report.Contains("custombg")){bool prepared=false;for(int i=0;i<300;i++){await Task.Delay(100);if(await web.CoreWebView2.ExecuteScriptAsync("!state.backgroundLoading && reference.background.key==='custom'")=="true"){prepared=true;break;}}if(!prepared)throw new Exception("Custom background preparation timed out.");}if(report.Contains("webp"))await web.CoreWebView2.ExecuteScriptAsync("document.querySelector('[data-background=new-01].background-choice').click();");
  if(report.Contains("image"))await web.CoreWebView2.ExecuteScriptAsync("document.querySelector('[data-background=red].background-choice').click();var logoCanvas=document.createElement('canvas');logoCanvas.width=100;logoCanvas.height=100;var logoCtx=logoCanvas.getContext('2d');logoCtx.fillStyle='#ffffff';logoCtx.fillRect(25,25,50,50);state.logo=new Image();state.logo.src=logoCanvas.toDataURL();");await web.CoreWebView2.ExecuteScriptAsync(""+(report.Contains("anim")?"":"document.getElementById('introToggle').checked=false;document.getElementById('exitAnimation').value='none';")+""+(report.Contains("custom")?"":"document.getElementById('exportResolution').value='"+(report.Contains("4k")?"2160":report.Contains("image")?"1080":"720")+"';")+"document.getElementById('startExport').click();");for(int i=0;i<2400;i++){await Task.Delay(250);if(report.Contains("cancel")&&await web.CoreWebView2.ExecuteScriptAsync("(state.exportTime||0)>.1 && !state.cancelled")=="true")await web.CoreWebView2.ExecuteScriptAsync("document.getElementById('cancelExport').click();");if(await web.CoreWebView2.ExecuteScriptAsync("!state.exporting && !state.nativeSceneProbing")=="true")break;}}
 await web.CoreWebView2.ExecuteScriptAsync("window.historyCheck={complete:false};nativeCall('history').then(async records=>{historyCheck.count=records.length;historyCheck.initial=window.initialHistoryCount;historyCheck.persisted=records.length>0&&records[0].exists;historyCheck.toast=!document.getElementById('exportToast').hidden;if(records.length){historyCheck.opened=(await nativeCall('openExport',{recordId:records[0].id})).opened;historyCheck.folder=(await nativeCall('revealExport',{recordId:records[0].id})).opened;}try{await nativeCall('openExport',{recordId:'unregistered-record'});historyCheck.invalidRejected=false;}catch{historyCheck.invalidRejected=true;}historyCheck.complete=true;});");
 for(int i=0;i<80;i++){await Task.Delay(100);if(await web.CoreWebView2.ExecuteScriptAsync("window.historyCheck.complete")=="true")break;}
 var result=await web.CoreWebView2.ExecuteScriptAsync("({nativeLanguage:window.languageCheck||null,language:QaseedaI18n.language,htmlDirection:document.documentElement.dir,settings:getExportSettings(),selectedColor:state.color,backgroundLoader:state.lastBackgroundLoader,background:reference.background.key,arabicFont:document.getElementById('arabicFont').value,latinFont:document.getElementById('latinFont').value,history:window.historyCheck,status:document.getElementById('status').textContent,seconds:state.lastExportSeconds,renderSeconds:state.lastExportRenderSeconds,engine:state.lastExportEngine,audioPaused:audio.paused,audioContextCreated:!!state.context,encoder:state.lastExportEncoder,audioTransfer:state.lastExportAudioTransfer,shared:state.lastExportShared,frames:state.lastExportFrames,profile:state.lastExportProfile,pixelFormat:state.lastExportPixelFormat,duration:audio.duration,offline:!!window.NATIVE_EXPORT_AVAILABLE})");File.WriteAllText(report,File.ReadAllText(report).Substring(0,File.ReadAllText(report).Length-1)+",\"export\":"+result+"}");
 }catch(Exception e){File.AppendAllText(report,"\nERROR: "+e);}finally{Close();}}
}

internal sealed class StudioCaption:Panel {
 internal StudioCaption(){DoubleBuffered=true;SetStyle(ControlStyles.ResizeRedraw,true);}
 protected override void OnPaintBackground(PaintEventArgs e){
  using(var brush=new LinearGradientBrush(ClientRectangle,ColorTranslator.FromHtml("#F5ECD9"),ColorTranslator.FromHtml("#EADDC7"),14f))e.Graphics.FillRectangle(brush,ClientRectangle);
  e.Graphics.SmoothingMode=SmoothingMode.AntiAlias;

  using(var line=new Pen(Color.FromArgb(65,149,109,55),1))e.Graphics.DrawLine(line,14,Height-1,Width-14,Height-1);
 }
}
internal sealed class StudioCaptionButton:Control {
 bool hover,pressed;
 internal StudioCaptionButton(){SetStyle(ControlStyles.UserPaint|ControlStyles.AllPaintingInWmPaint|ControlStyles.OptimizedDoubleBuffer|ControlStyles.SupportsTransparentBackColor|ControlStyles.StandardClick|ControlStyles.ResizeRedraw,true);BackColor=Color.Transparent;AccessibleRole=AccessibleRole.PushButton;}
 protected override void OnPaintBackground(PaintEventArgs e){
  Control ancestor=Parent;Point offset=Location;
  while(ancestor!=null&&!(ancestor is StudioCaption)){offset.Offset(ancestor.Left,ancestor.Top);ancestor=ancestor.Parent;}
  if(ancestor==null){e.Graphics.Clear(ColorTranslator.FromHtml("#F1E7D6"));return;}
  var state=e.Graphics.Save();e.Graphics.TranslateTransform(-offset.X,-offset.Y);
  InvokePaintBackground(ancestor,new PaintEventArgs(e.Graphics,ancestor.ClientRectangle));e.Graphics.Restore(state);
 }
 protected override void OnMouseEnter(EventArgs e){hover=true;Invalidate();base.OnMouseEnter(e);}
 protected override void OnMouseLeave(EventArgs e){hover=pressed=false;Invalidate();base.OnMouseLeave(e);}
 protected override void OnMouseDown(MouseEventArgs e){pressed=true;Invalidate();base.OnMouseDown(e);}
 protected override void OnMouseUp(MouseEventArgs e){pressed=false;Invalidate();base.OnMouseUp(e);}
 protected override void OnPaint(PaintEventArgs e){
  var g=e.Graphics;g.SmoothingMode=SmoothingMode.AntiAlias;
  if(hover||pressed){using(var shape=new GraphicsPath()){float x=2,y=2,w=Width-4,h=Height-4,r=12;shape.AddArc(x,y,r,r,180,90);shape.AddArc(x+w-r,y,r,r,270,90);shape.AddArc(x+w-r,y+h-r,r,r,0,90);shape.AddArc(x,y+h-r,r,r,90,90);shape.CloseFigure();using(var b=new SolidBrush(Text=="×"?Color.FromArgb(pressed?130:85,190,91,67):Color.FromArgb(pressed?120:70,255,255,255)))g.FillPath(b,shape);}}
  float cx=Width/2f,cy=Height/2f;using(var pen=new Pen(Text=="×"&&hover?Color.FromArgb(133,47,34):Color.FromArgb(94,69,38),1.35f)){
   if(Text=="—")g.DrawLine(pen,cx-5,cy+3,cx+5,cy+3);
   else if(Text=="×"){g.DrawLine(pen,cx-4,cy-4,cx+4,cy+4);g.DrawLine(pen,cx+4,cy-4,cx-4,cy+4);}
   else if(Text=="❐"){g.DrawLines(pen,new[]{new PointF(cx-2,cy-5),new PointF(cx+5,cy-5),new PointF(cx+5,cy+2)});g.DrawRectangle(pen,cx-5,cy-2,7,7);}
   else g.DrawRectangle(pen,cx-4.5f,cy-4.5f,9,9);
  }
 }
}
