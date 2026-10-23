using System;
using System.Collections.Generic;
internal sealed partial class NativeExport {
 bool english;
 static readonly Dictionary<string,string> NativeEnglish=new Dictionary<string,string>{
  {"قالب قصيدة","Qaseeda Template"},
  {"هناك تصدير جارٍ بالفعل.","An export is already running."},
  {"حفظ الفيديو","Save video"},
  {"التصدير غير نشط.","No export is running."},
  {"تعذّر ترميز الفيديو:","Video encoding failed:"},
  {"تعذّر تجهيز الخلفية.","Could not prepare the background."},
  {"اكتمل التصدير","Export complete"},
  {"اضغط لفتح الفيديو.","Click to open the video."},
  {"هذا الملف غير موجود في سجل التصدير.","This file is not in export history."},
  {"تعذّر العثور على الفيديو. ربما نُقل أو حُذف.","Could not find the video. It may have been moved or deleted."},
  {"نوع الملف غير مدعوم.","Unsupported file type."},
 };
 string L(string value){if(!english)return value;string core=value.Trim(),translated;if(core.Length>0&&NativeEnglish.TryGetValue(core,out translated)){int i=value.IndexOf(core,StringComparison.Ordinal);return value.Substring(0,i)+translated+value.Substring(i+core.Length);}return value;}
}
