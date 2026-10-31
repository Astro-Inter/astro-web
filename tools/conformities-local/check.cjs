const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = process.env.ASTRO_DATABASE_REPO || path.resolve(__dirname, '../../../../BANCO DE DADOS/banco-de-dados');
const { Client } = require(path.join(root, 'node_modules/pg'));
const client = new Client({ host:'127.0.0.1',port:54657,database:'astro657',user:'astro_local',password:'astro657_local_only' });
const base='http://127.0.0.1:8067';
const forms=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
let manualId;
let temporaryUnitId;
async function token(email) {
  const response=await fetch('http://127.0.0.1:9167/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local-key', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'AstroLocal657!',returnSecureToken:true})});
  const body=await response.json(); assert.equal(response.status,200); return body.idToken;
}
async function request(route,token,method='GET',data,expected=200) {
  const response=await fetch(base+route,{method,headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
  const body=await response.json(); assert.equal(response.status,expected,route+' '+JSON.stringify(body));
  return body.data;
}
async function main() {
  await client.connect();
  for (let attempt = 0; attempt < 120; attempt++) {
    try { await fetch(base + '/conformities/units', { signal: AbortSignal.timeout(1500) }); break; }
    catch { if (attempt === 119) throw Error('A API local ainda não está disponível em 127.0.0.1:8067. Confira os logs de inicialização.'); await new Promise(resolve => setTimeout(resolve, 1000)); }
  }
  const manager=await token('gestor@astro.local'), outsider=await token('outro@astro.local');
  temporaryUnitId=Number((await client.query('INSERT INTO unidade(workspace_id,nome,ativo) VALUES(1,$1,true) RETURNING id_unidade',['Verificação automática '+crypto.randomUUID()])).rows[0].id_unidade);
  const noAuth=await fetch(base+'/conformities/units'); assert.ok([401,403].includes(noAuth.status));
  const employeeList=await request('/conformities/collaborators',manager); assert.ok(employeeList.some(row=>row.collaboratorId===2));
  const employeeDetails=await request('/conformities/collaborators/'+employeeList[0].id,manager);
  assert.equal(employeeDetails.id,employeeList[0].id);
  await request('/conformities',manager,'GET',undefined,404);
  await request('/conformities/units',manager,'POST',{unitId:3,nrId:1},404);
  const created=await request('/conformities/units',manager,'POST',{unitId:temporaryUnitId,nrId:10,expiresAt:null},201); manualId=created.id;
  assert.equal(created.type,'UNIDADE');
  await request('/conformities/units/'+manualId,outsider,'GET',undefined,404);
  await request('/conformities/units',manager,'POST',{unitId:temporaryUnitId,nrId:10},409);
  const changed=await request('/conformities/units/'+manualId,manager,'PUT',{nrId:10,expiresAt:'2028-10-27'}); assert.equal(changed.expiresAt,'2028-10-27');
  await request('/conformities/units/'+manualId+'/applicability',manager,'PATCH',{applicable:false});
  assert.equal((await request('/conformities/units',manager)).some(row=>row.id===manualId),false);
  execFileSync('docker',['--context','desktop-linux','exec','astro657-mongo','mongosh','--quiet','--eval',`const d=db.getSiblingDB('astro657'); const ids=${JSON.stringify(forms)};
    ids.forEach((id,i)=>{const template=d.forms.findOne({_id:'65700000-0000-4000-8000-00000000000'+(i+1)}); template._id=id; template.titulo='Verificação automática '+(i+1); delete template.analise; d.forms.insertOne(template);});`],{stdio:'pipe'});
  for(let index=0;index<2;index++) {
    await request('/forms/'+forms[index]+'/review',manager,'POST',{status:'approved'});
    await request('/forms/'+forms[index]+'/review',manager,'POST',{status:'approved'});
    const values=(await client.query('SELECT tipo,usuario_id,unidade_id,nr_id,data_validade::text,origem FROM conformidade WHERE formulario_resposta_id=$1',[forms[index]])).rows;
    assert.equal(values.length,1); assert.equal(values[0].tipo,'UNIDADE'); assert.equal(values[0].usuario_id,null);
    assert.equal(Number(values[0].unidade_id),index===0?2:1); assert.equal(values[0].data_validade,'2028-10-27');
  }
  await request('/forms/'+forms[2]+'/review',manager,'POST',{status:'rejected',description:'Reprovação fictícia para validar ausência de conformidade.'});
  await client.query('DELETE FROM conformidade WHERE formulario_resposta_id=$1',[forms[0]]);
  await request('/forms/'+forms[0]+'/review',manager,'POST',{status:'approved'});
  assert.equal((await client.query('SELECT 1 FROM conformidade WHERE formulario_resposta_id=$1',[forms[0]])).rowCount,1);
  assert.equal((await client.query('SELECT 1 FROM conformidade WHERE formulario_resposta_id=$1',[forms[2]])).rowCount,0);
  const unitList=await request('/conformities/units',manager); assert.ok(unitList.some(row=>row.formResponseId===forms[0]));
  await client.query('BEGIN');
  const invalid=[
    "INSERT INTO conformidade(tipo,usuario_id,unidade_id,nr_id,aplicavel,origem) VALUES('UNIDADE',2,2,1,true,'MANUAL')",
    "INSERT INTO conformidade(tipo,nr_id,aplicavel,origem) VALUES('UNIDADE',1,true,'MANUAL')",
    "INSERT INTO conformidade(tipo,unidade_id,nr_id,aplicavel,origem) VALUES('OUTRO',2,1,true,'MANUAL')",
    "INSERT INTO conformidade(tipo,unidade_id,nr_id,aplicavel,origem) VALUES('UNIDADE',2,1,true,'FORMULARIO')"
  ];
  for(const sql of invalid) { await client.query('SAVEPOINT invalid'); await assert.rejects(client.query(sql),error=>error.code==='23514'); await client.query('ROLLBACK TO SAVEPOINT invalid'); }
  await client.query('ROLLBACK');
  console.log('Fluxo integrado validado: autenticação local, colaboradores preservados, CRUD de unidades, duplicidade, isolamento de workspace, aprovação com e sem unidade, validade, repetição idempotente, reprovação e constraints.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  try { await client.query('ROLLBACK'); await client.query('DELETE FROM conformidade WHERE formulario_resposta_id=ANY($1::text[]) OR id_conformidade=$2 OR unidade_id=$3',[forms,manualId||-1,temporaryUnitId||-1]); if(temporaryUnitId) await client.query('DELETE FROM unidade WHERE id_unidade=$1',[temporaryUnitId]); } catch {}
  try { execFileSync('docker',['--context','desktop-linux','exec','astro657-mongo','mongosh','--quiet','--eval',`db.getSiblingDB('astro657').forms.deleteMany({_id:{$in:${JSON.stringify(forms)}}})`],{stdio:'pipe'}); } catch {}
  await client.end();
});
