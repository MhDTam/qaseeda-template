import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
for(const file of readdirSync('.').filter(name=>name.endsWith('.js'))){
 const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
 assert.equal(result.status,0,`Invalid JavaScript: ${file}`);
}
const html=readFileSync('index.html','utf8');
for(const match of html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g))readFileSync(match[1]);
const sandbox={window:{}};vm.runInNewContext(readFileSync('assets/template-data.js','utf8'),sandbox);
const data=sandbox.window.NAGHAM_TEMPLATE;
assert.ok(data.cover&&data.motion&&data.backgrounds.red);
assert.ok(!data.audio&&!data.waveform,'Do not ship default demo audio.');
const keys=[...html.matchAll(/<button[^>]*class="background-choice[^\"]*"[^>]*data-background="([^\"]+)"/g)].map(match=>match[1]).filter(key=>key!=='custom');
assert.deepEqual(keys.sort(),Object.keys(data.backgrounds).sort(),'Preset buttons and assets differ.');
for(const [key,item] of Object.entries(data.backgrounds))assert.match(item.color,/^#[a-f\d]{6}$/i,`Missing color: ${key}`);
console.log(`Source checks passed: ${keys.length} presets, custom upload, no demo audio.`);

const locale={window:{}};vm.runInNewContext(readFileSync('locales/en.js','utf8'),locale);
const dictionary=locale.window.QASEEDA_EN;
for(const match of html.matchAll(/data-i18n(?:-(?:placeholder|title|aria-label))?="([^"]+)"/g)){
 const key=match[1].replaceAll('&quot;','"').replaceAll('&amp;','&');
 assert.ok(dictionary[key],`Missing English translation: ${key}`);
}
assert.equal(JSON.parse(readFileSync('package.json','utf8')).displayVersion,'1.00');
console.log(`English locale coverage passed: ${Object.keys(dictionary).length} translations; version 1.00.`);

if(existsSync('.public-source.json')){
 const manifest=JSON.parse(readFileSync('.public-source.json','utf8'));
 assert.equal(manifest.version,'1.00');
 assert.ok(!/data:(?:video|audio)\//i.test(JSON.stringify(data)),'Reference audio/video must not be public.');
 assert.ok(!/base64/i.test(readFileSync('assets/thmanyah.css','utf8')),'Do not embed the proprietary font.');
 assert.ok(!keys.includes('original'),'Private reference preset must not be public.');
 assert.equal(new Set(manifest.files).size,manifest.files.length,'Duplicate public source path.');
 for(const name of manifest.files){
  assert.ok(!name.startsWith('/')&&!name.includes('..')&&!name.includes('\\')&&!/^[a-z]:/i.test(name),'Unsafe manifest path.');
  assert.ok(!/^(?:release|output|publish|node_modules|desktop\/deps)\//.test(name),'Private output in source manifest.');
  const content=readFileSync(name);
  if(/\.(?:js|mjs|html|css|cs|ps1|md|json|yml)$/.test(name))assert.ok(!/(?:C:[\\/]Users[\\/]moham|M:[\\/]Codex)/i.test(content.toString('utf8')),`Personal path in ${name}`);
 }
 console.log(`Public release checks passed: ${manifest.files.length} allowed source files, no private reference media or embedded font.`);
}
