'use strict';
// Pack BT.709 limited-range NV12 on the GPU, directly into the native shared buffer.
class ExportFramePacker {
 constructor(width,height){if(width%4!==0||height%2!==0)throw Error('unaligned-nv12');
  this.width=width;this.height=height;this.canvas=document.createElement('canvas');this.canvas.width=width/4;this.canvas.height=height*3/2;
  const gl=this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:false});if(!gl)throw Error('webgl-unavailable');
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
  const vertex='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragment=`precision highp float;uniform sampler2D source;uniform vec2 size;
  vec3 pixel(float x,float y){return texture2D(source,(vec2(x,y)+.5)/size).rgb;}
  float luma(vec3 c){return (16.+219.*dot(c,vec3(.2126,.7152,.0722)))/255.;}
  vec2 chroma(float x,float y){vec3 c=(pixel(x,y)+pixel(x+1.,y)+pixel(x,y+1.)+pixel(x+1.,y+1.))*.25;return (vec2(128.)+224.*vec2(dot(c,vec3(-.114572,-.385428,.5)),dot(c,vec3(.5,-.454153,-.045847))))/255.;}
  void main(){float x=floor(gl_FragCoord.x)*4.,y=floor(gl_FragCoord.y);if(y<size.y)gl_FragColor=vec4(luma(pixel(x,y)),luma(pixel(x+1.,y)),luma(pixel(x+2.,y)),luma(pixel(x+3.,y)));else{float cy=(y-size.y)*2.;vec2 a=chroma(x,cy),b=chroma(x+2.,cy);gl_FragColor=vec4(a,b);}}`;
  const program=this.program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('packer-link');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'source'),0);gl.uniform2f(gl.getUniformLocation(program,'size'),width,height);gl.disable(gl.DITHER);gl.disable(gl.BLEND);gl.pixelStorei(gl.PACK_ALIGNMENT,1);
 }
 copy(source,destination){const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.drawArrays(gl.TRIANGLES,0,6);gl.readPixels(0,0,this.canvas.width,this.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,destination);if(gl.getError()!==gl.NO_ERROR)throw Error('تعذّر نقل إطار الفيديو.');}
 dispose(){this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
