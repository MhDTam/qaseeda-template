'use strict';
// Typography is rasterized once; Direct3D composes every animated frame.
async function prepareNativeScene(settings){
 const scale=settings.width/1280,make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},png=c=>c.toDataURL('image/png').split(',')[1],r=reference,color=state.color;
 const overlay=make(settings.width,settings.height),c=overlay.getContext('2d');c.scale(scale,scale);
 r.text(c,$('artistLatin').value.trim()||$('artist').value.trim(),640,210,31,380,'#fff3e6',$('artistLatin').value.trim()?'600 {size}px '+$('latinFont').value:'700 {size}px '+$('arabicFont').value,$('artistLatin').value.trim()?'ltr':'rtl');
 r.text(c,[$('artist').value.trim(),$('trackTitle').value.trim()].filter(Boolean).join(' - '),640,236,17,445,'#e6d5c5','{size}px '+$('arabicFont').value,'rtl');
 c.strokeStyle='#efddc442';c.lineWidth=1;c.beginPath();c.moveTo(640,253);c.lineTo(1085,253);c.stroke();
 const logo=$('logoEnabled').checked?state.logo:null;
 if(!logo||$('logoPosition').value!=='card'){c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(1066,201,11,Math.PI,0);c.stroke();c.fillStyle=color;c.beginPath();c.roundRect(1053,199,6,15,2);c.roundRect(1073,199,6,15,2);c.fill();}
 const control=make(60*scale,60*scale),pc=control.getContext('2d');pc.scale(scale,scale);pc.translate(-840,-320);
 const play=pc.createLinearGradient(845,325,895,376);play.addColorStop(0,color+'cc');play.addColorStop(1,color);pc.fillStyle=play;pc.strokeStyle=color+'ee';pc.lineWidth=1.3;pc.beginPath();pc.roundRect(846,327,15,46,3);pc.roundRect(873,327,15,46,3);pc.fill();pc.stroke();

 for(const dx of [-17,17]){r.triangle(c,675+dx,350,18,false,color+'ae');r.triangle(c,1051+dx,350,18,true,color+'ae');}
 c.strokeStyle=color+'80';c.lineWidth=3;c.beginPath();c.moveTo(640,450);c.lineTo(1085,450);c.stroke();
 c.direction='ltr';c.font='17px Segoe UI';c.fillStyle='#dfcdbf';c.textAlign='right';c.fillText(r.clock(audio.duration),1085,478);
 r.transportTools(c,color);
 const glyphs=make(Math.round(242*scale),Math.round(32*scale)),g=glyphs.getContext('2d');g.scale(scale,scale);g.font='17px Segoe UI';g.fillStyle='#dfcdbf';const glyphAdvances=[];for(let i=0;i<11;i++){const ch=i===10?':':String(i);g.fillText(ch,i*22+1,24);glyphAdvances.push(g.measureText(ch).width);}
 const imagePng=(image,maxEdge=4096)=>{const factor=Math.min(1,maxEdge/Math.max(image.width,image.height)),p=make(Math.max(1,Math.round(image.width*factor)),Math.max(1,Math.round(image.height*factor)));p.getContext('2d').drawImage(image,0,0,p.width,p.height);return png(p);};
 const motion=window.NAGHAM_TEMPLATE.motion,background=r.background.key;
 return {scene:{...settings,duration:audio.duration,color,background,glyphAdvances,motion:{cover:motion.cover,fps:motion.fps,lightColumns:motion.lightColumns,lightGrid:motion.lightGrid,lightSize:motion.lightSize},waveform:state.waveform,wave:$('waveToggle').checked,waveHeight:Number($('waveSize').value),preserveOriginal:$('originalColors').checked,preserveBackgroundColors:background==='custom'&&$('preserveBackgroundColors').checked,entranceEnabled:$('introToggle').checked,entrance:$('entranceAnimation').value,exit:$('exitAnimation').value,entryDuration:Number($('entranceDuration').value),exitDuration:Number($('exitDuration').value),logoPosition:$('logoPosition').value,logoSize:Number($('logoSize').value),logoOpacity:Number($('logoOpacity').value)/100},assets:{overlay:png(overlay),control:png(control),photo:imagePng(state.image||r.cover),glyphs:png(glyphs),...(logo?{logo:imagePng(logo)}:{}),...(background==='original'?{backgroundVideo:window.NAGHAM_TEMPLATE.original.video.split(',')[1]}:{backgroundImage:imagePng(r.textures[background]),light:motion.light.startsWith('data:image/png')?motion.light.split(',')[1]:imagePng(r.motionImages.light,Infinity)})}};
}
async function exportNativeScene(settings){
 if(settings.format!=='mp4')return false;let supported=false;state.nativeSceneProbing=true;try{const capabilities=await nativeCall('capabilities');if(capabilities.cancelled){status(ui('تم إلغاء التصدير.'));return true;}supported=capabilities.nativeScene;}catch{}finally{state.nativeSceneProbing=false;}if(!supported)return false;
 if(state.exporting||state.savingImage)return true;
 const previousTime=audio.currentTime;audio.pause();reference.pause();state.exporting=state.offlineExport=state.nativeSceneExport=true;state.cancelled=false;state.exportTime=0;state.nativeSceneBegin=0;state.nativeSceneFps=settings.fps;lockEditor(true);$('exportProgress').hidden=false;$('progress').value=0;status(ui('جارٍ تجهيز المشهد لمحرك كرت الشاشة…'));$('progressText').textContent=ui('جارٍ تجهيز التصدير…');
 try{
  if(state.analysisPromise)await state.analysisPromise;
  const payload=await prepareNativeScene(settings),direct=!!state.audioFile&&typeof window.chrome.webview.postMessageWithAdditionalObjects==='function';
  if(state.cancelled)return true;
  const name=($('trackTitle').value.trim()||ui('قالب قصيدة')).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,70);
  const result=await nativeCall('scene',{...payload,name,audio:direct?null:await blobBase64(await(await fetch(audio.currentSrc||audio.src)).blob())},direct?[state.audioFile]:null);
  if(result.cancelled){status(ui('تم إلغاء التصدير.'));return true;}
  exportCompleted(result.entry);state.lastExportSeconds=result.seconds;state.lastExportRenderSeconds=result.renderSeconds;state.lastExportFrames=result.frames;state.lastExportEncoder='Direct3D11 / NVENC';state.lastExportAudioTransfer=result.audioTransfer;state.lastExportShared=false;state.lastExportPixelFormat='GPU texture';state.lastExportEngine='native-scene';status(ui('تم حفظ الفيديو مع الصوت خلال ')+result.seconds.toFixed(1)+ui(' ثانية.'));
 }catch(error){status(state.cancelled?ui('تم إلغاء التصدير.'):ui('تعذّر التصدير: ')+error.message);}
 finally{state.exporting=state.offlineExport=state.nativeSceneExport=false;await reference.seek(previousTime).catch(()=>{});$('exportProgress').hidden=true;lockEditor(false);state.dirty=true;}
 return true;
}
