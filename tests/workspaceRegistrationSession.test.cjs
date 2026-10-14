const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const moduleUnderTest = { exports: {} }
const source = fs.readFileSync(path.join(__dirname, '../src/utils/workspaceRegistrationSession.ts'), 'utf8')
new Function('module', 'exports', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(moduleUnderTest, moduleUnderTest.exports)
const { encryptRegistrationSnapshot, decryptRegistrationSnapshot } = moduleUnderTest.exports

function snapshot() {
  return {
    draft: {
      email: 'gestor@example.com', password: 'SenhaTeste123', company: { name: 'Empresa Teste', cnpj: '12345678000195' },
      units: [{ id: 1, name: 'Matriz', cep: '01001000', state: 'SP', city: 'São Paulo', neighborhood: 'Sé', street: 'Praça da Sé', number: '10', complement: 'Sala 1', source: 'spreadsheet' }, { id: 2, name: 'Unidade extra', cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: '', source: 'manual' }],
      file: new File([new Uint8Array([80, 75, 3, 4, 0, 255, 7])], 'teste.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', lastModified: 12345 }),
    },
    verifiedEmail: 'gestor@example.com',
    state: { status: 'idle', error: '', failureStatus: 0, importErrors: [], result: null },
  }
}

test('restaura rascunho completo e bytes da planilha sem salvar senha em texto simples', async () => {
  const input = snapshot()
  const stored = await encryptRegistrationSnapshot(input, 'aba-teste')
  assert.equal(stored.key.extractable, false)
  assert.equal(new TextDecoder().decode(stored.encrypted).includes(input.draft.password), false)
  const restored = await decryptRegistrationSnapshot(structuredClone(stored))
  assert.equal(restored.verifiedEmail, input.verifiedEmail)
  assert.equal(restored.draft.password, input.draft.password)
  assert.deepEqual(restored.draft.company, input.draft.company)
  assert.deepEqual(restored.draft.units, input.draft.units)
  assert.equal(restored.draft.file.name, input.draft.file.name)
  assert.equal(restored.draft.file.lastModified, 12345)
  assert.deepEqual(await restored.draft.file.arrayBuffer(), await input.draft.file.arrayBuffer())
})

test('descarta versão incompatível, rascunho vencido e alteração do conteúdo criptografado', async () => {
  const stored = await encryptRegistrationSnapshot(snapshot(), 'aba-teste')
  assert.equal(await decryptRegistrationSnapshot({ ...stored, _versao: 2 }), null)
  assert.equal(await decryptRegistrationSnapshot({ ...stored, savedAt: Date.now() - 25 * 60 * 60 * 1000 }), null)
  const tampered = new Uint8Array(stored.encrypted.slice(0))
  tampered[0] ^= 1
  await assert.rejects(decryptRegistrationSnapshot({ ...stored, encrypted: tampered.buffer }))
})

test('reload durante envio restaura erro recuperável, sem retomar envio automaticamente', async () => {
  const input = snapshot()
  input.state.status = 'loading'
  const restored = await decryptRegistrationSnapshot(await encryptRegistrationSnapshot(input, 'aba-teste'))
  assert.equal(restored.state.status, 'error')
  assert.match(restored.state.error, /cadastro foi interrompido/)
  assert.equal(restored.draft.password, input.draft.password)
})

test('preserva resultado confirmado e não associa verificação a outro e-mail', async () => {
  const input = snapshot()
  input.state = { status: 'success', result: { workspaceId: 123, importErrors: [] }, error: '', failureStatus: 0, importErrors: [] }
  input.verifiedEmail = 'outro@example.com'
  const restored = await decryptRegistrationSnapshot(await encryptRegistrationSnapshot(input, 'aba-teste'))
  assert.equal(restored.verifiedEmail, '')
  assert.equal(restored.state.status, 'success')
  assert.equal(restored.state.result.workspaceId, 123)
})
