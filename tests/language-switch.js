async(page)=>{
 await page.setViewportSize({width:1280,height:840});
 await page.waitForFunction(()=>typeof state!=='undefined'&&state.assetsReady);
 await page.locator('[data-language="en"]').click();
 if(!await page.evaluate(()=>document.documentElement.lang==='en'&&document.documentElement.dir==='ltr'&&document.querySelector('h1').textContent==='Turn your sound into a scene.'))throw Error('English locale not applied');
 await page.locator('#trackTitle').fill('My poem — قصيدتي');
 await page.locator('#artist').fill('اسم القارئ');
 const english=await page.evaluate(()=>({
  options:Array.from(document.querySelectorAll('#entranceAnimation option,#exitAnimation option,#exportQuality option')).map(option=>option.textContent),
  placeholder:document.getElementById('trackTitle').placeholder,
  status:document.getElementById('status').textContent
 }));
 if(english.options.some(value=>/[\u0600-\u06ff]/.test(value))||english.placeholder!=='Enter a track title'||/[\u0600-\u06ff]/.test(english.status))throw Error(JSON.stringify(english));
 await page.locator('[data-language="ar"]').click();
 if(!await page.evaluate(()=>document.documentElement.dir==='rtl'&&document.getElementById('trackTitle').value==='My poem — قصيدتي'&&document.getElementById('artist').value==='اسم القارئ'))throw Error('Switching language changed user data');
 await page.locator('[data-language="en"]').click();await page.reload();
 await page.waitForFunction(()=>state.assetsReady);
 if(!await page.evaluate(()=>QaseedaI18n.language==='en'&&document.documentElement.dir==='ltr'))throw Error('Language preference not saved');
 return {english:true,arabic:true,optionsTranslated:true,userValuesPreserved:true,persisted:true,version:'1.02'};
}
