const http=require('http'),fs=require('fs'),path=require('path');
const root=process.argv[2], port=+process.argv[3]||8765;
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.css':'text/css','.ttf':'font/ttf','.otf':'font/otf','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]); if(p.endsWith('/')) p+='index.html';
  const f=path.join(root,p);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('nope');}
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(f).pipe(res);
}).listen(port,()=>console.log('serving',root,'on',port));
