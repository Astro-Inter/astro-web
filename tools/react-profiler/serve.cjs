const http=require('http'),fs=require('fs'),path=require('path');
const files=new Set(['index.html','parent.js','memo.js','baseline.js','style.css']);
http.createServer((req,res)=>{const name=new URL(req.url,'http://127.0.0.1').pathname.slice(1)||'index.html';if(!files.has(name)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(__dirname,'.build',name)))}).listen(5202,'127.0.0.1',()=>console.log('Profiler local em http://127.0.0.1:5202'));
