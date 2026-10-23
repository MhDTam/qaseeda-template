'use strict';
let backgroundLoadVersion=0,customBackgroundThumbnail=null,activeBackgroundJob=null;
function cancelBackgroundPreparation(){if(activeBackgroundJob)activeBackgroundJob.cancel();}
async function prepareBackgroundImage(file){
 if(typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined'&&typeof createImageBitmap==='function'&&file.type!=='image/svg+xml'){
  const workerUrl=URL.createObjectURL(new Blob(['('+qaseedaBackgroundWorker.toString()+')()'],{type:'text/javascript'}));
  let worker;
  try{worker=new Worker(workerUrl);}catch{URL.revokeObjectURL(workerUrl);}
  if(worker)return await new Promise((resolve,reject)=>{
   let timer;
   const job={cancel:()=>finish(new DOMException('Cancelled','AbortError'))};
   const finish=(error,value)=>{clearTimeout(timer);worker.terminate();URL.revokeObjectURL(workerUrl);if(activeBackgroundJob===job)activeBackgroundJob=null;error?reject(error):resolve(value);};
   activeBackgroundJob=job;
   worker.onmessage=event=>event.data.error?finish(Error(event.data.error)):finish(null,{...event.data,loader:'worker'});
   worker.onerror=event=>{event.preventDefault();finish(Error(event.message||'Image worker failed'));};
   timer=setTimeout(()=>finish(Error('Image preparation timed out')),30000);
   try{worker.postMessage(file);}catch(error){finish(error);}
  });
 }
 // SVG and browsers without OffscreenCanvas use the asynchronous image decoder.
 const url=URL.createObjectURL(file),image=new Image();
 try{
  image.src=url;await image.decode();
  const sw=Math.min(image.naturalWidth,image.naturalHeight*16/9),sh=sw*9/16;
  const width=Math.max(16,Math.min(3840,Math.floor(sw/16)*16)),height=width*9/16;
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#080605';context.fillRect(0,0,width,height);
  context.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2,sw,sh,0,0,width,height);
  const thumb=document.createElement('canvas');thumb.width=256;thumb.height=144;thumb.getContext('2d').drawImage(canvas,0,0,256,144);
  const thumbnail=await new Promise(resolve=>thumb.toBlob(resolve,'image/webp',.85));
  if(!thumbnail)throw Error('Thumbnail failed');
  return {image:canvas,thumbnail,loader:'image'};
 }finally{URL.revokeObjectURL(url);}
}
async function useCustomBackground(file){
 cancelBackgroundPreparation();const version=++backgroundLoadVersion;
 let prepared=null,installed=false;
 state.backgroundLoading=true;$('backgroundThumb').closest('.upload').setAttribute('aria-busy','true');syncControls();
 status(ui('جارٍ تجهيز الخلفية… يمكنك متابعة استخدام البرنامج.'));
 try{
  prepared=await prepareBackgroundImage(file);
  if(version!==backgroundLoadVersion||state.exporting)return;
  const thumbnail=URL.createObjectURL(prepared.thumbnail),previous=reference.textures.custom;
  reference.background.replaceTexture('custom',prepared.image);installed=true;
  if(previous&&typeof previous.close==='function')previous.close();
  window.NAGHAM_TEMPLATE.backgrounds.custom={color:state.color};
  if(customBackgroundThumbnail)URL.revokeObjectURL(customBackgroundThumbnail);customBackgroundThumbnail=thumbnail;
  $('backgroundName').textContent=file.name;
  $('backgroundThumb').style.backgroundImage='url('+thumbnail+')';$('backgroundThumb').querySelector('svg').style.visibility='hidden';
  $('customBackgroundChoiceThumb').style.backgroundImage='url('+thumbnail+')';$('customBackgroundChoice').hidden=false;
  $('preserveBackgroundColors').checked=true;$('customBackgroundChoice').click();
  state.lastBackgroundLoader=prepared.loader;state.dirty=true;
  status(ui('أُضيفت خلفيتك مع حركة إضاءة تلقائية. تُملأ مساحة المشهد بقصّ الأطراف دون تمديد الصورة.'));
 }finally{
  if(prepared&&!installed&&typeof prepared.image.close==='function')prepared.image.close();
  if(version===backgroundLoadVersion){state.backgroundLoading=false;$('backgroundThumb').closest('.upload').removeAttribute('aria-busy');syncControls();}
 }
}
$('backgroundFile').addEventListener('change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file||state.exporting||!state.assetsReady)return;
 try{await useCustomBackground(file);}catch(error){if(error.name!=='AbortError')status(ui('تعذّر فتح الخلفية. جرّب صورة PNG أو JPG أو WebP.'));}
});
$('preserveBackgroundColors').addEventListener('change',()=>{state.dirty=true;});
$('removeBackground').addEventListener('click',async()=>{
 if(state.exporting)return;cancelBackgroundPreparation();++backgroundLoadVersion;state.backgroundLoading=false;
 $('backgroundThumb').closest('.upload').removeAttribute('aria-busy');
 await reference.chooseBackground('red');const previous=reference.textures.custom;reference.background.removeTexture('custom');
 if(previous&&typeof previous.close==='function')previous.close();delete window.NAGHAM_TEMPLATE.backgrounds.custom;
 $('customBackgroundChoice').hidden=true;$('customBackgroundSettings').hidden=true;
 $('backgroundName').textContent=ui('صورة من جهازك مع حركة إضاءة تلقائية');$('backgroundThumb').style.backgroundImage='';$('backgroundThumb').querySelector('svg').style.visibility='';
 if(customBackgroundThumbnail)URL.revokeObjectURL(customBackgroundThumbnail);customBackgroundThumbnail=null;
 document.querySelector('.background-choice[data-background="red"]').click();state.dirty=true;syncControls();status(ui('أُزيلت الخلفية الخاصة.'));
});
document.querySelectorAll('.upload[for]').forEach(label=>{
 label.tabIndex=0;label.setAttribute('role','button');
 label.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){const input=$(label.htmlFor);if(input&&!input.disabled){event.preventDefault();input.click();}}});
});
window.addEventListener('pagehide',()=>{cancelBackgroundPreparation();if(customBackgroundThumbnail)URL.revokeObjectURL(customBackgroundThumbnail);const image=reference.textures.custom;if(image&&typeof image.close==='function')image.close();});
