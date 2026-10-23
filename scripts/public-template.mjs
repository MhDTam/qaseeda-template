// Original, code-generated artwork and moving-light atlas for the public repository.
const svgData=s=>'data:image/svg+xml;base64,'+Buffer.from(s).toString('base64');
export function createPublicTemplate(source){
 const backgrounds={};let index=0;
 for(const [key,item] of Object.entries(source.backgrounds)){
  if(key==='original'||key==='custom')continue;
  const c=item.color,offset=(index++%4)*45;
  const art=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="#040405"/><stop offset=".55" stop-color="${c}" stop-opacity=".2"/><stop offset="1" stop-color="#040304"/></linearGradient><linearGradient id="r" x2="0" y2="1"><stop stop-color="${c}" stop-opacity="0"/><stop offset=".5" stop-color="${c}" stop-opacity=".7"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient><filter id="f"><feGaussianBlur stdDeviation="19"/></filter></defs><rect width="1920" height="1080" fill="#040405"/><rect width="1920" height="1080" fill="url(#b)"/><g transform="rotate(-19 960 540) translate(0 ${offset})" fill="none" stroke="url(#r)" filter="url(#f)"><path d="M-300 740C450 160 1050 1100 2220 140" stroke-width="135"/><path d="M-220 850C410 400 1280 890 2180 320" stroke-width="65"/></g><path d="M-120 800C500 220 1350 930 2140 150" fill="none" stroke="${c}" stroke-opacity=".28" stroke-width="2"/></svg>`;
  backgrounds[key]={color:c,name:item.name||key,image:svgData(art)};
 }
 const columns=10,frames=250,w=128,h=72,rows=Math.ceil(frames/columns);
 let tiles='';
 for(let n=0;n<frames;n++){
  const angle=2*Math.PI*n/frames,x=(n%columns)*w,y=Math.floor(n/columns)*h;
  let stops='';
  for(let i=0;i<=16;i++){
   const v=Math.round(128+38*Math.sin(i*.65-angle));
   stops+=`<stop offset="${i/16}" stop-color="rgb(${v},${v},${v})"/>`;
  }
  tiles+=`<defs><linearGradient id="f${n}" x2="1" y2="1">${stops}</linearGradient></defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#f${n})"/>`;
 }
 const cover=Array.from({length:frames},(_,n)=>{const t=Math.min(1,n/25/2.2),e=t*t*(3-2*t);return [Math.round(310-105*e),Math.round(354-183*e),Math.round(281*e),Math.round(285*e)];});
 return {...source,backgrounds,original:{baseColor:'#d83a11',video:'',width:1920,height:1080},motion:{fps:25,frames,cover,light:svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="${columns*w}" height="${rows*h}">${tiles}</svg>`),lightGrid:[w,h],lightSize:[columns*w,rows*h],lightColumns:columns}};
}
