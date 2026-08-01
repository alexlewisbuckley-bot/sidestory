import http from 'http';import fs from 'fs';import path from 'path';import zlib from 'zlib';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml',
 '.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.avif':'image/avif',
 '.webp':'image/webp','.json':'application/json','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let f=decodeURIComponent(req.url.split('?')[0]); if(f==='/')f='/index.html';
  const p=path.join(process.cwd(),f);
  fs.readFile(p,(e,d)=>{
    if(e){res.writeHead(404);return res.end()}
    const ext=path.extname(p); const type=T[ext]||'application/octet-stream';
    const compressible=/text|javascript|json|svg/.test(type);
    const ae=req.headers['accept-encoding']||'';
    res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control', /woff2|jpg|png|avif|webp|svg/.test(ext)?'public,max-age=31536000,immutable':'public,max-age=0,must-revalidate');
    if(compressible&&/br/.test(ae)){res.setHeader('Content-Encoding','br');return res.end(zlib.brotliCompressSync(d))}
    if(compressible&&/gzip/.test(ae)){res.setHeader('Content-Encoding','gzip');return res.end(zlib.gzipSync(d))}
    res.end(d);
  });
}).listen(8802,()=>console.log('8802'));
