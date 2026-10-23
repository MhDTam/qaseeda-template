cbuffer State:register(b0){float4 rect;float4 tint;float4 params;float4 extra;float4 meta;float4 timing;float4 transform;float4 masks;float4 maskParams;};
Texture2D img:register(t0);Texture2D light:register(t1);SamplerState samp:register(s0);
struct V{float4 pos:SV_Position;float2 uv:TEXCOORD0;};
V vs(uint id:SV_VertexID){float2 uv=float2((id==1||id==2||id==4)?1:0,(id>=2&&id<=4)?1:0);float2 p=rect.xy+uv*rect.zw;V o;o.pos=float4(p.x/1280*2-1,1-p.y/720*2,0,1);o.uv=uv;return o;}
float rounded(float2 p,float2 size,float r){float2 q=abs(p-size*.5)-(size*.5-r);return length(max(q,0))+min(max(q.x,q.y),0)-r;}
float aa(float distance){return 1-smoothstep(-.5/meta.x,.5/meta.x,distance);}
float3 hsv(float3 c){float4 K=float4(0,-1./3,2./3,-1);float4 p=c.g<c.b?float4(c.bg,K.wz):float4(c.gb,K.xy);float4 q=c.r<p.x?float4(p.xyw,c.r):float4(c.r,p.yzx);float d=q.x-min(q.w,q.y);return float3(abs(q.z+(q.w-q.y)/(6*d+1e-7)),d/(q.x+1e-7),q.x);}
float3 rgb(float3 c){float3 p=abs(frac(c.xxx+float3(0,2./3,1./3))*6-3);return c.z*lerp(float3(1,1,1),saturate(p-1),c.y);}
float field(float f,float2 p){float2 tile=float2(fmod(f,extra.x),floor(f/extra.x));return light.SampleLevel(samp,(tile*extra.yz+.5+p*(extra.yz-1))/timing.xy,0).r;}
float4 ps(V i):SV_Target{
 float2 p=i.uv*rect.zw;int kind=(int)params.x;
 if(kind==0){float3 c=img.Sample(samp,i.uv).rgb;if(params.y>.5){float3 h=hsv(c);if(params.w<.5){h.x=tint.x;h.y=tint.y*smoothstep(.02,.35,h.y);}float now=lerp(field(floor(timing.z),i.uv),field(ceil(timing.z),i.uv),frac(timing.z));h.z*=clamp((now+.04)/(field(0,i.uv)+.04),.45,2.1);c=rgb(h);}else if(params.z>.5){float value=max(c.r,max(c.g,c.b)),neutral=smoothstep(.5,.9,min(c.r,min(c.g,c.b))/max(value,.001));c=lerp(rgb(float3(tint.xy,1))*value,value.xxx,neutral);}return float4(c,1);}
 if(kind==1)return img.Sample(samp,i.uv)*tint.a;
 if(kind==2){float a=aa(rounded(p,rect.zw,params.y))*tint.a;return float4(tint.rgb*a,a);}
 if(kind==3){float2 local=p-extra.xy;float d=rounded(local,extra.zw,14),shadow=exp(-pow(max(d,0)*meta.x/9,2)*.5)*.73;float ring=aa(d),border=ring-aa(d+1.6);float4 outC=float4(0,0,0,shadow);float3 ringC=lerp(float3(.0314,.0235,.0196),tint.rgb,border*.533333);outC=float4(ringC*ring+outC.rgb*(1-ring),ring+outC.a*(1-ring));float2 photo=local-9;float mask=aa(rounded(photo,extra.zw-18,11));float2 size=extra.zw-18,source=meta.yz;float scale=max(size.x/source.x,size.y/source.y);float2 uv=(photo-(size-source*scale)*.5)/(source*scale);float4 tex=img.Sample(samp,uv);outC=float4(tex.rgb*mask+outC.rgb*(1-mask),mask+outC.a*(1-mask));return outC;}
 if(kind==4){float d=rounded(p,rect.zw,49),a=aa(d)*tint.a;float2 uv=(rect.xy+p)/float2(1280,720);float2 delta=9/meta.x/float2(1280,720);float3 c=img.Sample(samp,uv).rgb*.25;c+=(img.Sample(samp,uv+float2(delta.x,0)).rgb+img.Sample(samp,uv-float2(delta.x,0)).rgb+img.Sample(samp,uv+float2(0,delta.y)).rgb+img.Sample(samp,uv-float2(0,delta.y)).rgb)*.125;c+=(img.Sample(samp,uv+delta).rgb+img.Sample(samp,uv-delta).rgb+img.Sample(samp,uv+float2(delta.x,-delta.y)).rgb+img.Sample(samp,uv+float2(-delta.x,delta.y)).rgb)*.0625;float mixp=saturate(dot(p,rect.zw)/dot(rect.zw,rect.zw));float4 glass= mixp<.55?lerp(float4(.043,.027,.023,.67),float4(.071,.031,.02,.49),mixp/.55):lerp(float4(.071,.031,.02,.49),float4(.027,.02,.02,.72),(mixp-.55)/.45);c=lerp(c,glass.rgb,glass.a);float border=aa(d)-aa(d+1);c=lerp(c,float3(.84,.77,.67),border*.35);return float4(c*a,a);}
 if(kind==5){float a=aa(rounded(p,rect.zw,min(rect.z,rect.w)*.5))*tint.a;return float4(tint.rgb*a,a);}
 if(kind==6){float2 mid=float2(640,360),q=(i.uv*float2(1280,720)-mid-transform.xy)/transform.z;float c=cos(transform.w),s=sin(transform.w);q=float2(c*q.x+s*q.y,-s*q.x+c*q.y)+mid;float2 uv=q/float2(1280,720);float4 col=img.Sample(samp,uv);if(any(uv<0)||any(uv>1))col=0;float a=timing.w;
 if(masks.x>.5){float feather=1280*.14,edge=maskParams.x*(1280+2*feather)-feather;a*=1-saturate((q.x-edge+feather)/(2*feather));}
 if(masks.y>.5){float feather=1280*.025,half=640*maskParams.y;a*=maskParams.y<=0?0:maskParams.y>=.999?1:saturate((half+feather-abs(q.x-640))/feather)*saturate(half/feather);}
 if(masks.z>.5){float feather=1280*.02,r=(length(mid)+feather)*maskParams.z;a*=maskParams.z<=0?0:maskParams.z>=.999?1:(1-saturate((length(q-mid)-max(0,r-feather))/(r+feather-max(0,r-feather))))*saturate(r/feather);}
 float3 bg=float3(8,6,5)/255;return float4(lerp(bg,col.rgb,col.a*a),1);}
 if(kind==7){float4 c=0;float weight=0;float2 delta=extra.xy*params.y;[unroll]for(int n=-12;n<=12;n++){float x=n/4.,w=exp(-.5*x*x);c+=img.Sample(samp,i.uv+delta*x)*w;weight+=w;}return c/weight;}
 if(kind==8){float2 uv=lerp(extra.xy,extra.zw,i.uv);return img.Sample(samp,uv)*tint.a;}
 return float4(1,0,1,1);
}
