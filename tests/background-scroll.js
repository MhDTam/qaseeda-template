async(page)=>{
 await page.setViewportSize({width:1280,height:840});
 await page.waitForFunction(()=>typeof state!=='undefined'&&state.assetsReady);
 await page.locator('[data-language="ar"]').click();
 const base64=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;
  const context=canvas.getContext('2d');context.fillStyle='#25394d';context.fillRect(0,0,1024,1536);
  context.fillStyle='#b65436';context.fillRect(0,400,512,700);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 await page.locator('.custom-background-upload').scrollIntoViewIfNeeded();
 // Simulate focus being restored to the file input after the native file picker.
 await page.evaluate(()=>document.getElementById('backgroundFile').focus());
 await page.locator('#backgroundFile').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
 await page.waitForFunction(()=>reference.background.key==='custom'&&!state.backgroundLoading);
 const result=await page.evaluate(()=>({
  outerScroll:document.querySelector('.workspace').scrollTop,
  loader:state.lastBackgroundLoader,
  width:reference.textures.custom.width,
  height:reference.textures.custom.height
 }));
 if(result.outerScroll!==0||result.width!==1024||result.height!==576||result.loader!=='worker')throw Error(JSON.stringify(result));
 const editor=await page.locator('.editor').boundingBox();
 await page.mouse.move(editor.x+editor.width/2,editor.y+100);await page.mouse.wheel(0,-2000);
 await page.waitForFunction(()=>document.querySelector('.editor').scrollTop===0);
 await page.locator('#removeBackground').click();
 await page.waitForFunction(()=>reference.background.key==='red'&&!reference.textures.custom);
 return {...result,scrollUp:true,removal:true};
}
