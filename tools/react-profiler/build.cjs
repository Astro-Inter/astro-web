const fs=require('fs'),path=require('path'),esbuild=require('./node_modules/esbuild');
const output=path.join(__dirname,'.build');fs.mkdirSync(output,{recursive:true});
const root=path.resolve(__dirname,'../..'),targetFile=path.join(__dirname,'target.js');
const targetSource=fs.readFileSync(targetFile,'utf8').replace('STABLE_REACT',path.join(root,'node_modules/react/index.js').replaceAll('\\','/')).replace('STABLE_DOM',path.join(root,'node_modules/react-dom/client.js').replaceAll('\\','/')).replace('ASTRO_CHART',path.join(root,'src/components/analyticsInteractiveChart/index.tsx').replaceAll('\\','/'));
(async()=>{
 await esbuild.build({entryPoints:[path.join(__dirname,'parent.jsx')],bundle:true,platform:'browser',format:'iife',outfile:path.join(output,'parent.js'),define:{'process.env.NODE_ENV':'"development"'}});
 for(const baseline of [false,true])await esbuild.build({stdin:{contents:targetSource,resolveDir:__dirname,sourcefile:targetFile,loader:'js'},bundle:true,platform:'browser',format:'iife',jsx:'automatic',outfile:path.join(output,baseline?'baseline.js':'memo.js'),define:{'process.env.NODE_ENV':'"development"','import.meta.env.BASE_URL':'"http://localhost:5173/"'},plugins:baseline?[{name:'comparison-only',setup(build){build.onLoad({filter:/analyticsInteractiveChart[\\/]index\.tsx$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace(/\buseMemo\s*\(/g,'((calculate) => calculate())('),loader:'tsx',resolveDir:path.dirname(args.path)}))}}]:[]});
 const css=['global.css','analytics.css','dataTable.css'].map(name=>fs.readFileSync(path.join(root,'styles',name),'utf8')).join('\n');
 fs.writeFileSync(path.join(output,'style.css'),css+'\nbody{padding:20px;font:14px system-ui;background:#1c1839;color:#f8f7fc}.bench-action{padding:12px 18px;background:#9600c9;color:white;border:0;border-radius:6px;cursor:pointer}h2{font-size:20px}');
 fs.copyFileSync(path.join(__dirname,'index.html'),path.join(output,'index.html'));
 console.log('Interface do React DevTools e comparação compiladas; código da aplicação preservado.');
})().catch(error=>{console.error(error);process.exitCode=1});
