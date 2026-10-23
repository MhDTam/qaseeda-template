'use strict';
// This function is serialized into a Blob worker so it also works in file:// WebView2.
function qaseedaBackgroundWorker(){
 self.onmessage=async event=>{
  let source=null,result=null;
  try{
   source=await createImageBitmap(event.data);
   const sw=Math.min(source.width,source.height*16/9),sh=sw*9/16;
   const width=Math.max(16,Math.min(3840,Math.floor(sw/16)*16)),height=width*9/16;
   const canvas=new OffscreenCanvas(width,height),context=canvas.getContext('2d',{alpha:false});
   context.fillStyle='#080605';context.fillRect(0,0,width,height);
   context.drawImage(source,(source.width-sw)/2,(source.height-sh)/2,sw,sh,0,0,width,height);
   source.close();source=null;
   const thumb=new OffscreenCanvas(256,144);thumb.getContext('2d').drawImage(canvas,0,0,256,144);
   const thumbnail=await thumb.convertToBlob({type:'image/webp',quality:.85});
   result=canvas.transferToImageBitmap();
   self.postMessage({image:result,thumbnail},[result]);result=null;
  }catch(error){self.postMessage({error:error.message||'Image decode failed'});}
  finally{if(source)source.close();if(result)result.close();}
 };
}
