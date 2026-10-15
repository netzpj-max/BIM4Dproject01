import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../docs/',import.meta.url));
const prefix='/BIM4Dproject01';
const port=Number(process.env.PORT||4198);
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.ttf':'font/ttf','.txt':'text/plain;charset=utf-8'};
http.createServer((request,response)=>{
 try{
  let pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  if(pathname===prefix){response.writeHead(302,{Location:prefix+'/'});response.end();return;}
  if(pathname.startsWith(prefix+'/'))pathname=pathname.slice(prefix.length);
  const destination=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const relative=path.relative(root,destination);
  if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.statSync(destination).isFile())throw Error('Not found');
  response.writeHead(200,{'Content-Type':types[path.extname(destination)]||'application/octet-stream','Cache-Control':'no-cache'});
  fs.createReadStream(destination).pipe(response);
 }catch{response.writeHead(404,{'Content-Type':'text/plain'});response.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Public preview: http://127.0.0.1:${port}${prefix}/#model`));
