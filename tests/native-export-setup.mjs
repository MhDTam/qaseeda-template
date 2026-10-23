import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Cancelling dependency selection must end the export attempt, not open it again
// through the slower fallback or leave the UI in a probing state.
for(const reply of [{cancelled:true},{nativeScene:false}]){
 const messages=[],box={state:{},ui:text=>text,status:text=>messages.push(text),nativeCall:async command=>{
  assert.equal(command,'capabilities');return reply;
 }};
 vm.createContext(box);vm.runInContext(readFileSync('native-scene-export.js','utf8'),box);
 const handled=await vm.runInContext("exportNativeScene({format:'mp4'})",box);
 assert.equal(handled,!!reply.cancelled);
 assert.equal(box.state.nativeSceneProbing,false);
 assert.equal(messages.length,reply.cancelled?1:0);
}
console.log('Native export setup passed: cancelled dependency selection is handled; unsupported hardware can fall back.');
