// Export a clean, runnable source tree. Never copy caches, recordings or private reference media.
import {mkdirSync,copyFileSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import vm from 'node:vm';
import {createPublicTemplate} from './public-template.mjs';
const root=resolve(import.meta.dirname,'..'),out=join(root,'publish/github');
mkdirSync(out,{recursive:true});
const files=['.gitignore','.gitattributes','package.json','README.md','README.en.md','CHANGELOG.md','LICENSE','THIRD_PARTY_NOTICES.md','CONTRIBUTING.md','SECURITY.md','TESTING.md','Start.cmd','index.html','styles.css','app.js','scene-renderer.js','native-scene-export.js','export-frame-packer.js','export-history.js','editor-options.js','custom-background.js','background-worker.js','i18n.js','locales/en.js',
 'tests/background-scroll.js','tests/language-switch.js','tests/ffmpeg-discovery.ps1','tests/native-export-setup.mjs','scripts/check-source.mjs','scripts/prepare-github.mjs','scripts/public-template.mjs',
 'desktop/Build.ps1','desktop/Restore-Dependencies.ps1','desktop/NaghamLauncher.cs','desktop/NativeExport.cs','desktop/NativeSceneExport.cs','desktop/ExportHistory.cs','desktop/ScreenColorPicker.cs','desktop/Localization.cs','desktop/Qaseeda.ico',
 'desktop/native-renderer/Build.ps1','desktop/native-renderer/main.cpp','desktop/native-renderer/scene.hlsl','desktop/native-renderer/include/json.hpp','desktop/native-renderer/include/nvEncodeAPI.h',
 'assets/app-icon.png','assets/app-icon-preview.png','assets/app-background.svg','assets/Thmanyah-License.pdf',
 'licenses/FFmpeg-License.txt','licenses/FFmpeg-Build.txt','licenses/NativeRenderer-Licenses.txt','licenses/WebView2-License.txt',
 'docs/BUILD.md','docs/PUBLISH.md','docs/screenshot.png','docs/screenshot-en.png','.github/workflows/ci.yml',
 '.editorconfig','.github/ISSUE_TEMPLATE/bug_report.yml','.github/ISSUE_TEMPLATE/feature_request.yml','.github/ISSUE_TEMPLATE/config.yml','.github/PULL_REQUEST_TEMPLATE.md','.github/dependabot.yml','.github/workflows/release.yml','docs/RELEASE_NOTES_1.00.md','scripts/package-release.ps1','desktop/FFmpegLocator.cs'];
for(const name of files){const target=join(out,name);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(root,name),target);}
const box={window:{}};vm.runInNewContext(readFileSync(join(root,'assets/template-data.js'),'utf8'),box);
const data=createPublicTemplate(box.window.NAGHAM_TEMPLATE);
writeFileSync(join(out,'assets/template-data.js'),'window.NAGHAM_TEMPLATE='+JSON.stringify(data)+';\n');
// The proprietary font remains optional, supplied locally by a licensed user.
writeFileSync(join(out,'assets/thmanyah.css'),'/* Optional: install a licensed Thmanyah font locally. System font fallback works without it. */\n');
writeFileSync(join(out,'.gitignore'),readFileSync(join(out,'.gitignore'),'utf8').replace(/^\/assets\/(?:template-data\.js|thmanyah\.css)\r?$/gm,'').trimEnd()+'\n');
const html=readFileSync(join(out,'index.html'),'utf8').replace(/<button class="background-choice" data-background="original".*?<\/button>/,'');
writeFileSync(join(out,'index.html'),html);
writeFileSync(join(out,'.public-source.json'),JSON.stringify({version:'1.00',files:[...files,'assets/template-data.js','assets/thmanyah.css','.public-source.json'].sort()},null,2)+'\n');
console.log('Prepared publish/github: generated artwork and motion, no reference video or embedded proprietary font.');
