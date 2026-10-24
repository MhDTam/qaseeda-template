'use strict';
window.QaseedaI18n=(()=>{
 let language='ar';
 try{language=localStorage.getItem('qaseeda-language')||window.QASEEDA_NATIVE_LANGUAGE||'ar';}catch{language=window.QASEEDA_NATIVE_LANGUAGE||'ar';}
 if(language!=='en')language='ar';
 const english=window.QASEEDA_EN||{};
 function text(value){
  const raw=String(value),core=raw.trim();
  if(language!=='en'||!Object.prototype.hasOwnProperty.call(english,core))return raw;
  return raw.slice(0,raw.indexOf(core))+english[core]+raw.slice(raw.indexOf(core)+core.length);
 }
 function applyStatic(){
  document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=text(element.dataset.i18n);});
  for(const attribute of ['placeholder','title','aria-label'])document.querySelectorAll('[data-i18n-'+attribute+']').forEach(element=>element.setAttribute(attribute,text(element.getAttribute('data-i18n-'+attribute))));
  document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
  document.title=text('قالب قصيدة')+' · 1.02';
 }
 function refreshDynamic(){
  if(typeof state==='undefined')return;
  syncControls();syncLogoControls();
  if(!state.audioFile)$('audioName').textContent=text('اختر MP3 أو WAV أو M4A');
  if(!state.image)$('imageName').textContent=text('اختر صورة PNG أو JPG');
  if(!state.logo)$('logoName').textContent=text('اختر لوغو، ويفضّل PNG شفافًا');
  if(!reference.textures.custom)$('backgroundName').textContent=text('صورة من جهازك مع حركة إضاءة تلقائية');
  document.querySelector('.wave-size small').textContent=text(Number($('waveSize').value)>=36?'كبير':Number($('waveSize').value)>=28?'متوسط':'صغير');
  $('waveNote').textContent=state.waveform?text('موجة حقيقية · ')+format(audio.duration)+text(' من الصوت'):text('مستخرجة من عينات الصوت الفعلية');
  $('exportHint').textContent=text(videoMime?'خيارات الدقة والجودة والصيغة قبل التصدير · مع الصوت':'لتصدير الفيديو، افتح البرنامج في Chrome أو Edge.');
  if(typeof latestExport!=='undefined'&&latestExport)$('toastFileName').textContent=latestExport.name+(latestExport.historySaved===false?text(' · السجل مؤقت لهذه الجلسة'):'');
  renderExportHistory();updateExportSummary();
  if(state.backgroundLoading)status('جارٍ تجهيز الخلفية… يمكنك متابعة استخدام البرنامج.');
  else if(!state.exporting)status(Number.isFinite(audio.duration)&&audio.duration>0?'المقطع جاهز. شغّل معاينة الحركة أو صدّر الفيديو.':'ابدأ بإضافة مقطعك الصوتي وصورة الغلاف.');
 }
 function syncNative(){
  if(window.NATIVE_EXPORT_AVAILABLE&&typeof nativeCall==='function')nativeCall('language',{language}).catch(()=>{});
 }
 function setLanguage(value){
  if(value!=='ar'&&value!=='en')return;
  language=value;try{localStorage.setItem('qaseeda-language',value);}catch{}
  applyStatic();refreshDynamic();syncNative();
  window.dispatchEvent(new CustomEvent('qaseeda-language-change',{detail:{language}}));
 }
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.language)));
  applyStatic();refreshDynamic();syncNative();
 });
 applyStatic();
 return {text,setLanguage,get language(){return language;},get locale(){return language==='en'?'en-US':'ar-IQ';}};
})();
function ui(value){return window.QaseedaI18n.text(value);}
