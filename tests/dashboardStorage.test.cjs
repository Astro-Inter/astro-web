const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
function setup() {
 const data = new Map(), remote = new Map(), calls = [], cache = new Map()
 global.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,value), removeItem: key => data.delete(key) }
 global.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }
 class DashboardApiError extends Error { constructor(message,status) { super(message); this.status=status } }
 const service = { DashboardApiError, dashboardRequest: async (url,init={}) => {
   calls.push({ url, init }); if (!init.method) return { items: [...remote.values()] }
   const id=url.split('/')[3].split('?')[0]
   if (init.method==='DELETE') { remote.delete(id); return }
   const value=JSON.parse(init.body)
   const row={ ...value,id,version:value.version+1,createdAt:'2026-10-31T12:00:00Z',updatedAt:'2026-10-31T12:00:00Z' }
   remote.set(id,row);return row
 } }
 function load(file) {
   file=path.resolve(file);if(cache.has(file)) return cache.get(file).exports
   const module={ exports:{} };cache.set(file,module)
   const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
   new Function('require','module','exports',code)(name => name==='./firebase' ? {firebaseAuth:{currentUser:{uid:'test'}}} : name==='./dashboards' ? service : load(path.resolve(path.dirname(file),name+'.ts')),module,module.exports)
   return module.exports
 }
 return { storage:load('src/services/dashboardStorage.ts'), data, remote, calls }
}
const identity={userId:'1',workspaceId:'2',role:'GESTOR'}, key='astro:dashboard-views:v1:test:1:2'
const draft={ name:'Meu painel', config:{filters:{start:'2026-10-01',end:'2026-10-31',granularity:'mes'},widgets:[],artwork:'trends'} }
test('salva estilo explicitamente pela API sem marcador no nome',async()=>{
 const {storage,calls}=setup();const row=await storage.saveDashboard(draft,null,identity)
 assert.equal(row.name,'Meu painel');assert.equal(row.config.artwork,'trends')
 const body=JSON.parse(calls[0].init.body);assert.equal(body.version,0);assert.equal(body.name,'Meu painel');assert.equal(body.config.artwork,'trends')
})
test('importa marcador legado uma vez e não recria visão excluída no servidor',async()=>{
 const {storage,data,remote,calls}=setup()
 const old={...draft,name:'Meu painel [ac1:d:1]',id:'00000000-0000-4000-8000-000000000001',version:1,createdAt:'2026-10-31T12:00:00Z',updatedAt:'2026-10-31T12:00:00Z'}
 data.set(key,JSON.stringify({schemaVersion:1,items:[old]}))
 const result=await storage.loadSavedDashboards(identity)
 assert.equal(result[0].name,'Meu painel');assert.equal(result[0].config.artwork,'trends');assert.equal(data.get(key+':migrado'),'1')
 assert.ok(data.get(key).includes('[ac1:d:1]'))
 remote.clear();assert.deepEqual(await storage.loadSavedDashboards(identity),[])
 assert.equal(calls.filter(row=>row.init.method==='PUT').length,1)
})
