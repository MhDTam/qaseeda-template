using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
internal sealed class ScreenColorPicker:Form {
 delegate IntPtr Hook(int code,IntPtr message,IntPtr data);
 [StructLayout(LayoutKind.Sequential)] struct PointData {public int x,y;}
 [DllImport("user32.dll")]static extern IntPtr SetWindowsHookEx(int id,Hook callback,IntPtr module,uint thread);
 [DllImport("user32.dll")]static extern bool UnhookWindowsHookEx(IntPtr hook);
 [DllImport("user32.dll")]static extern IntPtr CallNextHookEx(IntPtr hook,int code,IntPtr message,IntPtr data);
 [DllImport("kernel32.dll")]static extern IntPtr GetModuleHandle(string module);
 [DllImport("user32.dll")]static extern bool GetPhysicalCursorPos(out PointData position);
 [DllImport("user32.dll")]static extern IntPtr GetDC(IntPtr window);
 [DllImport("user32.dll")]static extern int ReleaseDC(IntPtr window,IntPtr dc);
 [DllImport("gdi32.dll")]static extern uint GetPixel(IntPtr dc,int x,int y);
 readonly Hook mouseCallback,keyCallback;IntPtr mouseHook,keyHook;readonly Timer update=new Timer{Interval=45};readonly Label value;readonly Panel swatch;bool selected,closing;Color pending;internal string PickedColor,Failure;
 internal ScreenColorPicker(bool english=false){Text=english?"Pick a color":"التقاط لون";FormBorderStyle=FormBorderStyle.FixedToolWindow;ControlBox=false;ShowInTaskbar=false;TopMost=true;StartPosition=FormStartPosition.Manual;Size=new Size(360,108);BackColor=ColorTranslator.FromHtml("#F4E9D9");Location=new Point(Screen.PrimaryScreen.WorkingArea.Left+24,Screen.PrimaryScreen.WorkingArea.Bottom-Height-24);Font=new Font("Segoe UI",10);RightToLeft=english?RightToLeft.No:RightToLeft.Yes;
  var hint=new Label{Text=english?"Click any screen color • Esc to cancel":"انقر على أي لون على الشاشة • Esc للإلغاء",AutoSize=false,Location=new Point(8,8),Size=new Size(326,24),TextAlign=ContentAlignment.MiddleCenter};Controls.Add(hint);swatch=new Panel{Location=new Point(22,40),Size=new Size(32,24)};Controls.Add(swatch);value=new Label{Location=new Point(70,40),Size=new Size(225,26),TextAlign=ContentAlignment.MiddleCenter,RightToLeft=RightToLeft.No};Controls.Add(value);
  mouseCallback=Mouse;keyCallback=Keyboard;update.Tick+=(s,e)=>{PointData p;if(GetPhysicalCursorPos(out p)){Color color=Sample(p.x,p.y);swatch.BackColor=color;value.Text=Hex(color);}};Shown+=(s,e)=>{mouseHook=SetWindowsHookEx(14,mouseCallback,GetModuleHandle(null),0);keyHook=SetWindowsHookEx(13,keyCallback,GetModuleHandle(null),0);if(mouseHook==IntPtr.Zero||keyHook==IntPtr.Zero){Failure=english?"Could not start the screen color picker.":"تعذّر تشغيل التقاط لون الشاشة.";Finish(false);return;}update.Start();};FormClosed+=(s,e)=>{update.Stop();update.Dispose();if(mouseHook!=IntPtr.Zero)UnhookWindowsHookEx(mouseHook);if(keyHook!=IntPtr.Zero)UnhookWindowsHookEx(keyHook);};
 }
 static string Hex(Color c){return "#"+c.R.ToString("x2")+c.G.ToString("x2")+c.B.ToString("x2");}
 static Color Sample(int x,int y){IntPtr dc=GetDC(IntPtr.Zero);try{uint c=GetPixel(dc,x,y);return Color.FromArgb((int)(c&255),(int)((c>>8)&255),(int)((c>>16)&255));}finally{ReleaseDC(IntPtr.Zero,dc);}}
 void Finish(bool accept){if(closing)return;closing=true;if(accept)PickedColor=Hex(pending);BeginInvoke(new Action(()=>{DialogResult=accept?DialogResult.OK:DialogResult.Cancel;Close();}));}
 IntPtr Mouse(int code,IntPtr message,IntPtr data){if(code>=0){int kind=message.ToInt32();if(kind==0x201){PointData p=(PointData)Marshal.PtrToStructure(data,typeof(PointData));pending=Sample(p.x,p.y);selected=true;return new IntPtr(1);}if(kind==0x202&&selected){Finish(true);return new IntPtr(1);}}return CallNextHookEx(mouseHook,code,message,data);}
 IntPtr Keyboard(int code,IntPtr message,IntPtr data){if(code>=0&&Marshal.ReadInt32(data)==27){if(message.ToInt32()==0x100||message.ToInt32()==0x104)Finish(false);return new IntPtr(1);}return CallNextHookEx(keyHook,code,message,data);}
}
