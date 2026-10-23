'use strict';
// Moving light is sampled directly from the reference clip; source images remain spatially intact.
class ReferenceBackground {
  constructor(images,motion){
    this.canvas=document.createElement('canvas');this.canvas.width=3840;this.canvas.height=2160;
    this.gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!this.gl)throw Error('webgl-unavailable');
    this.motion=window.NAGHAM_TEMPLATE.motion;this.images=images;this.key='red';const gl=this.gl;
    const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
    const fragment=`precision highp float;varying vec2 uv;uniform sampler2D fabric;uniform sampler2D referenceLight;uniform vec2 atlasSize;uniform vec2 grid;uniform float columns;uniform float frame;uniform float hue;uniform float saturation;uniform float applyLight;uniform float preserveTexture;
    vec3 rgb2hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);return vec3(abs(q.z+(q.w-q.y)/(6.*d+.0000001)),d/(q.x+.0000001),q.x);}
    vec3 hsv2rgb(vec3 c){vec3 p=abs(fract(c.xxx+vec3(0.,2./3.,1./3.))*6.-3.);return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y);}
    float field(float f,vec2 p){vec2 tile=vec2(mod(f,columns),floor(f/columns));vec2 q=(tile*grid+.5+p*(grid-1.))/atlasSize;return texture2D(referenceLight,q).r;}
    void main(){vec2 p=vec2(uv.x,1.-uv.y);float now=mix(field(floor(frame),p),field(ceil(frame),p),fract(frame));float first=field(0.,p);vec3 tex=texture2D(fabric,p).rgb;vec3 h=rgb2hsv(tex);if(preserveTexture<.5){h.x=hue;h.y=saturation*smoothstep(.02,.35,h.y);}h.z*=mix(1.,clamp((now+.04)/(first+.04),.45,2.1),applyLight);vec3 outColor=hsv2rgb(h);if(applyLight<.5){vec3 tint=hsv2rgb(vec3(hue,saturation,1.));float value=max(tex.r,max(tex.g,tex.b));outColor=tint*value;float neutral=smoothstep(.5,.9,min(tex.r,min(tex.g,tex.b))/max(value,.001));outColor=mix(outColor,vec3(value),neutral);}gl_FragColor=vec4(outColor,1.);}
`;
    const compile=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('shader-link');gl.useProgram(this.program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const upload=this.uploadTexture=(img,unit)=>{const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);return tex;};
    this.textures=Object.fromEntries(Object.entries(images).map(([key,img])=>[key,upload(img,0)]));this.textures.original=upload(images.red,0);upload(motion.light,1);
    for(const [name,unit] of [['fabric',0],['referenceLight',1]])gl.uniform1i(gl.getUniformLocation(this.program,name),unit);
    gl.uniform2fv(gl.getUniformLocation(this.program,'atlasSize'),this.motion.lightSize);gl.uniform2fv(gl.getUniformLocation(this.program,'grid'),this.motion.lightGrid);gl.uniform1f(gl.getUniformLocation(this.program,'columns'),this.motion.lightColumns);
    this.frame=gl.getUniformLocation(this.program,'frame');this.hueUniform=gl.getUniformLocation(this.program,'hue');this.saturation=gl.getUniformLocation(this.program,'saturation');this.applyLight=gl.getUniformLocation(this.program,'applyLight');this.preserveTexture=gl.getUniformLocation(this.program,'preserveTexture');
  }
  replaceTexture(key,image){const gl=this.gl;if(this.textures[key])gl.deleteTexture(this.textures[key]);this.textures[key]=this.uploadTexture(image,0);this.images[key]=image;}
  removeTexture(key){if(this.textures[key])this.gl.deleteTexture(this.textures[key]);delete this.textures[key];delete this.images[key];}
  hue(hex){const c=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255),max=Math.max(...c),min=Math.min(...c),d=max-min;if(!d)return 0;const h=max===c[0]?(c[1]-c[2])/d:max===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4;return(h/6+1)%1;}
  referenceTime(time){return Math.max(0,time)%10;}
  setGrade(color){const gl=this.gl,c=color.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255),max=Math.max(...c);gl.uniform1f(this.hueUniform,this.hue(color));gl.uniform1f(this.saturation,max?(max-Math.min(...c))/max:0);}
  grade(source,color){const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures.original);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);this.setGrade(color);gl.uniform1f(this.applyLight,0);gl.drawArrays(gl.TRIANGLES,0,6);return this.canvas;}
  draw(time,color,preserve=false){const gl=this.gl;gl.uniform1f(this.preserveTexture,preserve?1:0);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[this.key]);gl.uniform1f(this.frame,Math.min(this.motion.frames-1,this.referenceTime(time)*this.motion.fps));this.setGrade(color);gl.uniform1f(this.applyLight,1);gl.drawArrays(gl.TRIANGLES,0,6);return this.canvas;}

}
class OriginalVideoBackground {
  constructor(data,onFrame){
    this.baseColor=data.baseColor;this.onFrame=onFrame;this.video=document.createElement('video');this.video.muted=true;this.video.playsInline=true;this.video.loop=true;this.video.preload='auto';this.seeking=false;this.pendingTime=null;
    this.frameCanvas=document.createElement('canvas');this.frameCanvas.width=data.width||1920;this.frameCanvas.height=data.height||1080;this.nextCanvas=document.createElement('canvas');this.nextCanvas.width=data.width||1920;this.nextCanvas.height=data.height||1080;
    this.probe=document.createElement('canvas');this.probe.width=8;this.probe.height=4;this.probeCtx=this.probe.getContext('2d',{willReadFrequently:true});
    if(this.video.requestVideoFrameCallback){const receive=()=>{this.capture();this.video.requestVideoFrameCallback(receive)};this.video.requestVideoFrameCallback(receive);}
    this.ready=new Promise((resolve,reject)=>{this.video.addEventListener('loadeddata',()=>{this.capture();resolve()},{once:true});this.video.addEventListener('error',()=>reject(Error('original-video')),{once:true});});this.source=data.video;this.started=false;
  }
  load(){if(!this.started){this.started=true;this.video.src=this.source;}return this.ready;}
  capture(){if(this.video.readyState<2)return;this.probeCtx.drawImage(this.video,0,0,8,4);const data=this.probeCtx.getImageData(0,0,8,4).data;let sum=0;for(let i=0;i<data.length;i+=4)sum+=data[i]+data[i+1]+data[i+2];if(sum/96<.6)return;this.nextCanvas.getContext('2d').drawImage(this.video,0,0,this.nextCanvas.width,this.nextCanvas.height);[this.frameCanvas,this.nextCanvas]=[this.nextCanvas,this.frameCanvas];if(this.onFrame)this.onFrame();}
  mappedTime(time){const d=this.video.duration;return Number.isFinite(d)&&d>0?Math.max(0,time)%d:0;}
  async seek(time){const target=this.mappedTime(time);if(this.seeking){this.pendingTime=time;return;}this.seeking=true;this.video.pause();try{if(Math.abs(this.video.currentTime-target)>.018)await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);resolve()};const timer=setTimeout(()=>{this.video.removeEventListener('seeked',done);reject(Error('original-seek-timeout'))},5000);this.video.addEventListener('seeked',done,{once:true});this.video.currentTime=target;});this.capture();}finally{this.seeking=false;if(this.pendingTime!==null){const next=this.pendingTime;this.pendingTime=null;this.seek(next).catch(()=>{});}}}
  sync(time,playing){if(this.seeking)return;if(Math.abs(this.video.currentTime-this.mappedTime(time))>(playing?.22:.02)){this.seek(time).catch(()=>{});return;}if(playing&&this.video.paused)this.video.play().catch(()=>{});if(!playing)this.video.pause();if(!this.video.requestVideoFrameCallback)this.capture();}
  pause(){this.video.pause();}
}
class ReferenceScene {
  constructor(){
    this.cover=new Image();this.cover.src=window.NAGHAM_TEMPLATE.cover;
    const load=src=>{const img=new Image();img.src=src;return img;};
    const data=window.NAGHAM_TEMPLATE;
    this.textures=Object.fromEntries(Object.entries(data.backgrounds).filter(([key])=>key!=='original').map(([key,item])=>[key,load(item.image)]));
    this.motionImages={light:load(data.motion.light)};
    this.frameTime=7;this.seeking=false;this.onFrame=null;this.original=new OriginalVideoBackground(data.original,()=>{if(this.onFrame)this.onFrame()});
    this.ready=Promise.all([...[this.cover,...Object.values(this.textures),...Object.values(this.motionImages)].map(img=>img.decode())]).then(async()=>{this.background=new ReferenceBackground(this.textures,this.motionImages);this.background.key='red';});
  }
  async chooseBackground(key){this.background.key=key;if(key==='original'){await this.original.load();await this.original.seek(this.frameTime);}else this.original.pause();}

  sync(time,playing){this.frameTime=time;if(this.background.key==='original')this.original.sync(time,playing);else this.original.pause();}
  seek(time){this.frameTime=time;return this.background.key==='original'?this.original.seek(time):Promise.resolve();}
  pause(){this.original.pause();}
  ease(value){value=Math.max(0,Math.min(1,value));return value*value*(3-2*value);}
  rectAt(time){const data=window.NAGHAM_TEMPLATE.motion;time=Math.min(10,Math.max(0,time));const i=Math.min(data.frames-1,Math.floor(time*data.fps)),a=data.cover[i],b=data.cover[Math.min(i+1,data.frames-1)];if(!a)return [640,354,0,0];if(!b)return a;return a.map((v,j)=>v+(b[j]-v)*(time*data.fps-i));}

  hue(hex){const c=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255),max=Math.max(...c),min=Math.min(...c),d=max-min;if(!d)return 0;const h=max===c[0]?(c[1]-c[2])/d:max===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4;return(h*60+360)%360;}
  text(ctx,text,x,y,size,maxWidth,color,font,direction){ctx.direction=direction;ctx.textAlign='left';ctx.font=font.replace('{size}',size);while(ctx.measureText(text).width>maxWidth&&size>10)ctx.font=font.replace('{size}',--size);ctx.fillStyle=color;ctx.fillText(text,x,y);}
  clock(seconds){seconds=Math.max(0,Math.floor(seconds||0));const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60,secs=String(seconds%60).padStart(2,'0');return hours?hours+':'+String(minutes).padStart(2,'0')+':'+secs:minutes+':'+secs;}
  drawWave(ctx,rect,color,audioTime,waveform,liveSamples,height=40){
    const [x,y,w,h]=rect,scale=w/281,start=x+8*scale,base=y+h+49*scale,width=265*scale,bars=48,gap=width/bars,barWidth=2.8*scale;
    ctx.save();let peak=1;if(waveform){if(this.peakSource!==waveform){this.peakSource=waveform;this.cachedPeak=0;for(let i=0;i<waveform.min.length;i++)this.cachedPeak=Math.max(this.cachedPeak,Math.abs(waveform.min[i]),Math.abs(waveform.max[i]));}peak=this.cachedPeak||1;}
    const values=[];
    for(let i=0;i<bars;i++){let v=0;if(waveform){const rate=waveform.rate,center=audioTime-1.5+(i+.5)/bars*3,first=Math.floor((center-1.5/bars)*rate),last=Math.ceil((center+1.5/bars)*rate);for(let j=Math.max(0,first);j<=Math.min(last,waveform.min.length-1);j++)v=Math.max(v,Math.abs(waveform.min[j]),Math.abs(waveform.max[j]));v/=peak;}else if(liveSamples){const first=Math.floor(i/bars*liveSamples.length),last=Math.floor((i+1)/bars*liveSamples.length);for(let j=first;j<last;j++)v=Math.max(v,Math.abs(liveSamples[j]));}values.push(v);}
    this.lastWaveValues=values;
    for(let i=0;i<bars;i++){const smooth=(values[Math.max(0,i-1)]+2*values[i]+values[Math.min(bars-1,i+1)])/4,half=Math.max(.8*scale,Math.pow(smooth,.72)*height*scale*.83),px=start+(i+.5)*gap;ctx.fillStyle=color+(i<bars/2?'ee':'70');ctx.beginPath();ctx.roundRect(px-barWidth/2,base-half,barWidth,2*half,barWidth/2);ctx.fill();}
    ctx.restore();
  }
  icon(ctx,kind,x,y,color){
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();
    if(kind==='shuffle'){
      ctx.moveTo(-13,-9);ctx.lineTo(-9,-9);ctx.bezierCurveTo(-3,-9,3,9,9,9);ctx.lineTo(13,9);
      ctx.moveTo(-13,9);ctx.lineTo(-9,9);ctx.bezierCurveTo(-6,9,-4,5,-2,2);
      ctx.moveTo(2,-2);ctx.bezierCurveTo(4,-5,6,-9,9,-9);ctx.lineTo(13,-9);
      ctx.moveTo(9,-13);ctx.lineTo(13,-9);ctx.lineTo(9,-5);
      ctx.moveTo(9,5);ctx.lineTo(13,9);ctx.lineTo(9,13);
    }
    if(kind==='repeat'){
      ctx.moveTo(-13,2);ctx.lineTo(-13,-3);ctx.quadraticCurveTo(-13,-9,-7,-9);ctx.lineTo(13,-9);
      ctx.moveTo(9,-13);ctx.lineTo(13,-9);ctx.lineTo(9,-5);
      ctx.moveTo(13,-2);ctx.lineTo(13,3);ctx.quadraticCurveTo(13,9,7,9);ctx.lineTo(-13,9);
      ctx.moveTo(-9,5);ctx.lineTo(-13,9);ctx.lineTo(-9,13);
    }
    if(kind==='plus'){
      ctx.roundRect(-13,-13,26,26,7);
      ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.moveTo(0,-6);ctx.lineTo(0,6);
    }
    ctx.stroke();
    if(kind==='dots')for(const dx of [-8,0,8]){ctx.beginPath();ctx.arc(dx,0,1.9,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  transportTools(ctx,color){
    ctx.save();
    ctx.fillStyle='#ffffff04';ctx.strokeStyle='#ffffff0c';ctx.lineWidth=.8;
    ctx.beginPath();ctx.roundRect(644,497,450,50,16);ctx.fill();ctx.stroke();
    ['shuffle','repeat','plus','dots'].forEach((kind,i)=>this.icon(ctx,kind,[674,804,934,1064][i],522,color+'d4'));
    ctx.restore();
  }
  triangle(ctx,x,y,size,right,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+(right?-size:size),y-size);ctx.lineTo(x+(right?size:-size),y);ctx.lineTo(x+(right?-size:size),y+size);ctx.closePath();ctx.fill();}
  animationAt(options){
    const duration=Math.max(0,options.duration||0),enabled=options.entranceEnabled!==false,entrance=enabled?(options.entrance||'original'):'none',exit=options.exit||'none';
    const hasEntry=entrance!=='none',hasExit=exit!=='none',budget=duration>0?duration/(hasEntry&&hasExit?2:1):6;
    const entryDuration=Math.min(Math.max(.1,options.entryDuration||6),budget),exitDuration=Math.min(Math.max(.1,options.exitDuration||1.5),budget),t=Math.max(0,options.audioTime||0);
    const entry=hasEntry?this.ease(t/Math.max(.001,entryDuration)):1,leaving=hasExit&&duration>0?this.ease((t-(duration-exitDuration))/Math.max(.001,exitDuration)):0;
    const result={alpha:1,scale:1,x:0,y:0,blur:0,angle:0,masks:[],entryDuration,exitDuration,sceneTime:7+t};
    if(entrance==='original')result.sceneTime=t<entryDuration?t/Math.max(.001,entryDuration)*6:6+t-entryDuration;
    const apply=(kind,amount,isExit)=>{if(kind==='none'||kind==='original')return;if(['wipe','curtain','iris'].includes(kind)){result.masks.push({kind,progress:1-amount});return;}result.alpha*=1-amount;if(kind==='cinema'){result.scale*=isExit?1-.07*amount:1+.07*amount;result.blur+=3*amount;}if(kind==='tilt'){result.angle+=(isExit?-1:1)*.045*amount;result.scale*=1-.04*amount;result.x+=(isExit?-1:1)*65*amount;}if(kind==='zoom')result.scale*=isExit?1-.13*amount:.88+.12*(1-amount);if(kind==='right')result.x+=1400*amount;if(kind==='left')result.x-=1400*amount;if(kind==='up')result.y+=800*amount;if(kind==='down')result.y+=800*amount;if(kind==='blur')result.blur+=18*amount;};
    apply(entrance,1-entry,false);apply(exit,leaving,true);
    if(options.staticFrame)return{...result,alpha:1,scale:1,x:0,y:0,blur:0,angle:0,masks:[],sceneTime:7};
    return result;
  }
  draw(ctx,options){
    const effect=this.animationAt(options);this.lastAnimation=effect;
    if(!this.composite){this.composite=document.createElement('canvas');this.compositeCtx=this.composite.getContext('2d');}
    if(this.composite.width!==ctx.canvas.width||this.composite.height!==ctx.canvas.height){this.composite.width=ctx.canvas.width;this.composite.height=ctx.canvas.height;}
    this.compositeCtx.clearRect(0,0,this.composite.width,this.composite.height);this.drawScene(this.compositeCtx,{...options,sceneTime:effect.sceneTime});
    const w=ctx.canvas.width,h=ctx.canvas.height,s=w/1280;
    for(const mask of effect.masks){const m=this.compositeCtx,p=Math.max(0,Math.min(1,mask.progress));m.save();m.globalCompositeOperation='destination-in';m.fillStyle='#fff';if(mask.kind==='wipe'){const feather=w*.14,edge=p*(w+feather*2)-feather,g=m.createLinearGradient(edge-feather,0,edge+feather,0);g.addColorStop(0,'#fff');g.addColorStop(1,'#fff0');m.fillStyle=g;m.fillRect(0,0,w,h);}if(mask.kind==='curtain'||mask.kind==='iris'){if(!this.maskCanvas){this.maskCanvas=document.createElement('canvas');}if(this.maskCanvas.width!==w||this.maskCanvas.height!==h){this.maskCanvas.width=w;this.maskCanvas.height=h;}const mc=this.maskCanvas.getContext('2d');mc.clearRect(0,0,w,h);mc.globalAlpha=1;mc.fillStyle='#fff';if(p>=.999)mc.fillRect(0,0,w,h);else if(p>0){if(mask.kind==='curtain'){const feather=w*.025,half=w*.5*p,g=mc.createLinearGradient(w/2-half-feather,0,w/2+half+feather,0),stop=feather/(2*half+2*feather);g.addColorStop(0,'#fff0');g.addColorStop(stop,'#fff');g.addColorStop(1-stop,'#fff');g.addColorStop(1,'#fff0');mc.globalAlpha=Math.min(1,half/feather);mc.fillStyle=g;mc.fillRect(0,0,w,h);}else{const feather=w*.02,r=(Math.hypot(w,h)/2+feather)*p,g=mc.createRadialGradient(w/2,h/2,Math.max(0,r-feather),w/2,h/2,r+feather);g.addColorStop(0,'#fff');g.addColorStop(1,'#fff0');mc.globalAlpha=Math.min(1,r/feather);mc.fillStyle=g;mc.fillRect(0,0,w,h);}}m.drawImage(this.maskCanvas,0,0);}m.restore();}
ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#080605';ctx.fillRect(0,0,w,h);ctx.translate(w/2+effect.x*s,h/2+effect.y*s);ctx.rotate(effect.angle||0);ctx.scale(effect.scale,effect.scale);ctx.globalAlpha=effect.alpha;ctx.filter=effect.blur?'blur('+effect.blur*s+'px)':'none';ctx.drawImage(this.composite,-w/2,-h/2);ctx.restore();
  }
  drawLogo(ctx,options,time){
    const logo=options.logo;this.lastLogoBounds=null;if(!logo||!logo.width||!logo.height)return;
    const position=options.logoPosition||'card',desired=1280*Math.max(3,Math.min(14,options.logoSize||6))/100,card=position==='card',maxW=card?Math.min(desired,110):desired,maxH=card?60:desired,ratio=Math.min(maxW/logo.width,maxH/logo.height),w=logo.width*ratio,h=logo.height*ratio,margin=28;
    let x=position.includes('left')?margin:1280-margin-w,y=position.includes('bottom')?720-margin-h:margin;
    if(card){x=1090-w/2;y=201-h/2;}
    const alpha=Math.max(0,Math.min(1,options.logoOpacity===undefined?1:options.logoOpacity))*(card?this.ease((time-4.5)/.8):1);ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(logo,x,y,w,h);ctx.restore();this.lastLogoBounds={x,y,w,h,alpha,position};
  }
  drawScene(ctx,options){
    const {image,color,latin,artist,title,audioTime,duration,waveform,liveSamples,wave,waveHeight=40,playing=false,preserveOriginal=true}=options,time=options.sceneTime===undefined?this.frameTime:options.sceneTime;
    const scale=ctx.canvas.width/1280;
    ctx.save();ctx.setTransform(scale,0,0,scale,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(this.background.canvas.width!==ctx.canvas.width||this.background.canvas.height!==ctx.canvas.height){this.background.canvas.width=ctx.canvas.width;this.background.canvas.height=ctx.canvas.height;}
    const isOriginal=this.background.key==='original';let background;if(isOriginal){background=preserveOriginal?this.original.frameCanvas:this.background.grade(this.original.frameCanvas,color);ctx.drawImage(background,0,0,1280,720);}else{background=this.background.draw(time,color,this.background.key==='custom'&&options.preserveBackgroundColors!==false);ctx.drawImage(background,0,0,1280,720);}
    if(!isOriginal){const panel=this.ease(time/1.1);
    ctx.save();ctx.globalAlpha=panel;
    // A fresh, clean glass panel and vector edges are rendered at the output resolution.
    ctx.save();ctx.beginPath();ctx.roundRect(144,123,1024,466,49);ctx.clip();ctx.filter='blur(9px)';ctx.drawImage(background,0,0,1280,720);ctx.filter='none';
    let glass=ctx.createLinearGradient(144,123,1168,589);glass.addColorStop(0,'rgba(11,7,6,.67)');glass.addColorStop(.55,'rgba(18,8,5,.49)');glass.addColorStop(1,'rgba(7,5,5,.72)');ctx.fillStyle=glass;ctx.fillRect(144,123,1024,466);
    ctx.restore();
    const rim=ctx.createLinearGradient(144,123,1168,589);rim.addColorStop(0,'#e7d5c277');rim.addColorStop(.28,'#ffffff22');rim.addColorStop(.54,'#ffdec688');rim.addColorStop(.78,'#ffffff1c');rim.addColorStop(1,'#e2cbbb8a');ctx.strokeStyle=rim;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(144,123,1024,466,49);ctx.stroke();ctx.restore();}
    const rect=this.rectAt(time),[x,y,w,h]=rect;
    ctx.save();ctx.globalAlpha=w>0?1:0;ctx.shadowColor='#000b';ctx.shadowBlur=18;ctx.fillStyle='#080605';ctx.beginPath();ctx.roundRect(x-9,y-9,w+18,h+18,14);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=color+'88';ctx.lineWidth=1.6;ctx.stroke();ctx.beginPath();ctx.roundRect(x,y,w,h,11);ctx.clip();const photo=image||this.cover,s=Math.max(.0001,w/photo.width,h/photo.height);ctx.drawImage(photo,x+(w-photo.width*s)/2,y+(h-photo.height*s)/2,photo.width*s,photo.height*s);ctx.restore();
    const reveal=this.ease((time-4.5)/.8);ctx.save();ctx.globalAlpha=reveal;
    if(wave)this.drawWave(ctx,rect,color,audioTime,waveform,liveSamples,waveHeight);
    this.text(ctx,latin||artist,640,210,31,380,'#fff3e6',latin?'600 {size}px '+(options.latinFont||'Georgia'):'700 {size}px '+(options.arabicFont||'Thmanyah'),latin?'ltr':'rtl');
    this.text(ctx,[artist,title].filter(Boolean).join(' - '),640,236,17,445,'#e6d5c5','{size}px '+(options.arabicFont||'Thmanyah'),'rtl');
    ctx.strokeStyle='#efddc442';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(640,253);ctx.lineTo(1085,253);ctx.stroke();
    if(!options.logo||options.logoPosition!=='card'){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(1066,201,11,Math.PI,0);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(1053,199,6,15,2);ctx.roundRect(1073,199,6,15,2);ctx.fill();}
    ctx.save();this.lastControlState=playing?'pause':'play';
    const play=ctx.createLinearGradient(845,325,895,376);play.addColorStop(0,color+'cc');play.addColorStop(1,color);ctx.fillStyle=play;ctx.strokeStyle=color+'ee';ctx.lineWidth=1.3;ctx.beginPath();
    if(playing){ctx.roundRect(846,327,15,46,3);ctx.roundRect(873,327,15,46,3);}else{ctx.moveTo(853,326);ctx.quadraticCurveTo(850,324,850,328);ctx.lineTo(850,373);ctx.quadraticCurveTo(850,378,854,375);ctx.lineTo(890,353);ctx.quadraticCurveTo(895,350,890,347);ctx.closePath();}ctx.fill();ctx.stroke();ctx.restore();

    for(const dx of [-17,17]){this.triangle(ctx,675+dx,350,18,false,color+'ae');this.triangle(ctx,1051+dx,350,18,true,color+'ae');}
    ctx.strokeStyle=color+'80';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(640,450);ctx.lineTo(1085,450);ctx.stroke();
    const ratio=duration>0?Math.max(0,Math.min(1,audioTime/duration)):0;ctx.beginPath();ctx.moveTo(640,450);ctx.lineTo(640+445*ratio,450);ctx.lineWidth=2;ctx.strokeStyle='#ffe9d4';ctx.stroke();ctx.beginPath();ctx.arc(640+445*ratio,450,3,0,Math.PI*2);ctx.fillStyle='#ffe9d4';ctx.fill();
    ctx.direction='ltr';ctx.font='17px Segoe UI';ctx.fillStyle='#dfcdbf';ctx.textAlign='left';ctx.fillText(this.clock(audioTime),640,478);ctx.textAlign='right';ctx.fillText(this.clock(duration),1085,478);
    this.transportTools(ctx,color);
    ctx.restore();this.drawLogo(ctx,options,time);ctx.restore();
  }
}
window.ReferenceScene=ReferenceScene;
