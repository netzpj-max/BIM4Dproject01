import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../docs/',import.meta.url));
const registry=JSON.parse(fs.readFileSync(path.join(root,'drawings.json'),'utf8'));
const model=JSON.parse(fs.readFileSync(path.join(root,'model.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const allowed=new Set(['.html','.js','.css','.json','.png','.jpg','.ttf','.txt','.gz','']);
function walk(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path.join(folder,item.name)):[path.join(folder,item.name)]);}
const published=walk(root);
const rootFiles=new Set(['.nojekyll','index.html','app.js','app.bundle.js','branding.js','ifc-export.js','model.json','model.json.gz','drawings.json','verification.json','style.css','studio.css','public-guide.html']);
const assets=new Set(['NotoSansThai-UI-OFL.txt','NotoSansThai-UI-variable.ttf','npairender-icon.png']);
const vendor=new Set(['LICENSE','OrbitControls.js','three.core.js','three.module.js']);
for(const file of published){
 const relative=path.relative(root,file).split(path.sep).join('/');
 assert(rootFiles.has(relative)||relative.startsWith('thumbnails/')||relative.startsWith('assets/')&&assets.has(path.basename(file))||relative.startsWith('vendor/')&&vendor.has(path.basename(file)),`File outside publish allowlist: ${relative}`);
 assert(allowed.has(path.extname(file)),`Disallowed published file: ${file}`);
 assert(!/(^|[\\/])(drawings|downloads|originals|archives)([\\/]|$)/i.test(path.relative(root,file)),`Original folder leaked: ${file}`);
}
assert.equal(registry.access,'thumbnails-only');
const pageKeys=new Set(['id','file','page','discipline','sheetNumber','displayTitle','thumbnail','thumbnailWidth','thumbnailHeight']);
const fileKeys=new Set(['id','name','type','discipline','pageCount']);
for(const file of registry.files)assert(Object.keys(file).every(key=>fileKeys.has(key)),'Raw file metadata leaked');
const ids=new Set();
assert.deepEqual(gunzipSync(fs.readFileSync(path.join(root,'model.json.gz'))),fs.readFileSync(path.join(root,'model.json')),'Compressed model must preserve every byte of model data');
function jpegSize(data){
 let index=2;
 while(index<data.length){
  assert.equal(data[index++],0xff,'Invalid JPEG marker');
  while(data[index]===0xff)index++;
  const marker=data[index++];
  if([0xc0,0xc1,0xc2].includes(marker))return {height:data.readUInt16BE(index+3),width:data.readUInt16BE(index+5)};
  const length=data.readUInt16BE(index);assert(length>=2);index+=length;
 }
 throw Error('Missing JPEG size marker');
}
for(const page of registry.pages){
 assert(Object.keys(page).every(key=>pageKeys.has(key)),'Full drawing text or URL leaked');
 assert(/^thumbnails\/[A-Z0-9-]+\.jpg$/.test(page.thumbnail));
 assert(page.thumbnailWidth<=320&&page.thumbnailHeight<=320);
 const data=fs.readFileSync(path.join(root,page.thumbnail));
 assert(data.length<100000,'Thumbnail unexpectedly large');
 assert.equal(data.readUInt16BE(0),0xffd8,'Thumbnail must be JPEG');
 const size=jpegSize(data);
 assert(size.width<=320&&size.height<=320,'Full-resolution image leaked as a thumbnail');
 assert.equal(size.width,page.thumbnailWidth);assert.equal(size.height,page.thumbnailHeight);
 ids.add(page.id);
}
assert.equal(fs.readdirSync(path.join(root,'thumbnails')).length,registry.pages.length);
for(const element of model.elements)for(const id of element.source||[])assert(ids.has(id),`Missing thumbnail reference: ${id}`);
assert(!/sheetDialog|sheetPDF|sheetText/.test(html+app),'Full drawing modal is still present');
assert(!/drawings\/|downloads\//.test(html+app),'Original download path is still present');
assert(!registry.pages.some(page=>'url' in page||'text' in page));
assert(html.includes('id="sharePage"'));
assert(app.includes('navigator.clipboard.writeText'));
assert(!html.includes('PRIVATE WORKSPACE'));
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 const url=match[1];if(/^(https?:|data:)/.test(url))continue;
 assert(fs.existsSync(path.join(root,url.split('#')[0])),`Broken local link: ${url}`);
}
for(const file of published.filter(file=>/\.(json|js|html|css)$/.test(file)&&!file.includes(`${path.sep}vendor${path.sep}`))){
 const text=fs.readFileSync(file,'utf8');
 assert(!/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9]{25,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/.test(text),`Credential-like string: ${file}`);
 assert(!/[A-Z]:\\(?:Users|NPDESIGN)\\/i.test(text),`Local path leaked: ${file}`);
}
console.log(JSON.stringify({passed:true,files:published.length,elements:model.elements.length,tasks:model.tasks.length,thumbnails:registry.pages.length,originalFiles:0,fullDrawingText:false,fullDrawingModal:false,shareButton:true},null,2));
