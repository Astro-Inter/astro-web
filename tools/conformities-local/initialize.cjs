const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = process.env.ASTRO_DATABASE_REPO || path.resolve(__dirname, '../../../../BANCO DE DADOS/banco-de-dados');
const { Client } = require(path.join(root, 'node_modules/pg'));
const client = new Client({ host: '127.0.0.1', port: 54657, database: 'astro657', user: 'astro_local', password: 'astro657_local_only' });
const auth = 'http://127.0.0.1:9167/identitytoolkit.googleapis.com/v1/accounts:';
async function account(email) {
  const payload = { email, password: 'AstroLocal657!', returnSecureToken: true };
  let response = await fetch(auth + 'signUp?key=demo-local-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  let body = await response.json();
  if (body.error?.message === 'EMAIL_EXISTS') {
    response = await fetch(auth + 'signInWithPassword?key=demo-local-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); body = await response.json();
  }
  if (!response.ok) throw Error('Emulador Firebase: ' + body.error?.message);
  return body.localId;
}
async function main() {
  await client.connect();
  if ((await client.query('SELECT current_database() AS name')).rows[0].name !== 'astro657') throw Error('Banco local inesperado');
  if ((await client.query("SELECT to_regclass('public.conformidade') AS name")).rows[0].name) throw Error('A base astro657 já foi inicializada. Nenhum dado foi removido.');
  const identities = await Promise.all(['gestor@astro.local', 'respondente@astro.local', 'outro@astro.local'].map(account));
  await client.query('BEGIN');
  await client.query("SET TIME ZONE 'America/Sao_Paulo'");
  for (const file of ['database/scripts/1_create_table.sql', 'database/scripts/2_constraints.sql']) await client.query(fs.readFileSync(path.join(root, file), 'utf8'));
  let pending = ['logs', 'functions', 'views', 'procedures', 'indexes', 'triggers'].flatMap(folder => fs.readdirSync(path.join(root, 'database', folder)).filter(file => file.endsWith('.sql')).sort().map(file => path.join('database', folder, file)));
  while (pending.length) {
    const retry = []; let progress = 0;
    for (const file of pending) {
      await client.query('SAVEPOINT install_object');
      try { await client.query(fs.readFileSync(path.join(root, file), 'utf8')); progress++; }
      catch (error) { await client.query('ROLLBACK TO SAVEPOINT install_object'); retry.push(file); if (pending.length === 1) throw Error(file + ': ' + error.message); }
      await client.query('RELEASE SAVEPOINT install_object');
    }
    if (!progress) throw Error('Dependências não resolvidas: ' + retry.join(', '));
    pending = retry;
  }
  await client.query(fs.readFileSync(path.join(root, 'database/dataload/02_nr_catalogo.sql'), 'utf8'));
  await client.query(`INSERT INTO workspace (id_workspace,nome,cnpj) VALUES (1,'Astro Local SCRUM-657','00000000000657'),(2,'Outro workspace local','00000000000658');
    INSERT INTO cargo (id_cargo,workspace_id,nome,ativo) VALUES (1,1,'Gestão local',true),(2,2,'Outro cargo',true);
    INSERT INTO unidade (id_unidade,workspace_id,nome,ativo) VALUES (1,1,'Matriz de teste',true),(2,1,'Filial de teste',true),(3,2,'Unidade de outro workspace',true);
    INSERT INTO cargo_nr (cargo_id,nr_id) VALUES (1,1),(1,6),(1,10);
    INSERT INTO unidade_nr (unidade_id,nr_id) VALUES (1,1),(1,6),(2,1),(2,6);`);
  for (let index=0; index<identities.length; index++) {
    await client.query(`INSERT INTO usuario(id_usuario,tipo,cargo_id,unidade_id,nome,email,firebase_uid,status,modalidade,cpf)
      VALUES($1,$2,$3,$4,$5,$6,$7,'ATIVO','PRESENCIAL',$8)`,
      [index+1,index===0?'GESTOR_WORKSPACE':'GESTOR',index===2?2:1,index===2?3:1,['Gestor Local','Gestor Respondente','Outro Gestor'][index],['gestor@astro.local','respondente@astro.local','outro@astro.local'][index],identities[index],['00000000657','00000000658','00000000659'][index]]);
  }
  await client.query(`INSERT INTO conformidade(usuario_id,nr_id,aplicavel,data_validade,origem) VALUES(2,10,true,'2028-10-27','MANUAL');
    INSERT INTO conformidade(tipo,unidade_id,nr_id,aplicavel,data_validade,origem) VALUES('UNIDADE',2,6,true,'2027-10-27','MANUAL');
    SELECT setval(pg_get_serial_sequence('workspace','id_workspace'),2);
    SELECT setval(pg_get_serial_sequence('cargo','id_cargo'),2);
    SELECT setval(pg_get_serial_sequence('unidade','id_unidade'),3);
    SELECT setval(pg_get_serial_sequence('usuario','id_usuario'),3);`);
  await client.query('COMMIT');
  const formIds=['65700000-0000-4000-8000-000000000001','65700000-0000-4000-8000-000000000002','65700000-0000-4000-8000-000000000003'];
  const mongo = `const database = db.getSiblingDB('astro657');
    const ids = ${JSON.stringify(formIds)};
    ids.forEach((id,index) => database.forms.updateOne({_id:id}, {$setOnInsert:{
      _id:id,id_workspace:1,id_gestor_remetente:1,id_gestor:2,titulo:['Inspeção NR1 na Filial','Inspeção NR1 sem unidade','Inspeção NR6 para reprovar'][index],
      descricao:'Formulário fictício para validação local da SCRUM-657',nr:index===2?6:1,id_unidade:index===1?null:2,
      status:'CONCLUIDO',versao:1,criado_em:ISODate('2026-10-26T12:00:00Z'),respondido_em:ISODate('2026-10-27T12:00:00Z'),
      data_limite:ISODate('2026-10-30T03:00:00Z'),id_envio:'local-'+id,
      perguntas:[{id_pergunta:1,tipo:'texto',pergunta:'Descreva a inspeção',obrigatoria:true,resposta:['Condições verificadas no teste local.']}]
    }}, {upsert:true})); print('3 formulários locais disponíveis.');`;
  execFileSync('docker', ['--context','desktop-linux','exec','astro657-mongo','mongosh','--quiet','--eval',mongo], { stdio:'inherit' });
  console.log('PostgreSQL local instalado do zero. Contas fictícias prontas: gestor@astro.local / respondente@astro.local / outro@astro.local; senha de teste: AstroLocal657!');
}
main().catch(async error => { try { await client.query('ROLLBACK'); } catch {} console.error(error.message); process.exitCode=1; }).finally(()=>client.end());
