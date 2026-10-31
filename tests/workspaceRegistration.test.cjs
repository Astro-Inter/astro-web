const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const cache = new Map()
function loadTs(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8')
    .replaceAll('import.meta.env.VITE_API_URL', "'https://astro-api-h2hx.onrender.com/'")
    .replaceAll('import.meta.env.DEV', 'false')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'module', 'exports', code)(
    specifier => specifier.startsWith('.') ? loadTs(path.resolve(path.dirname(filename), `${specifier}.ts`)) : require(specifier),
    module, module.exports,
  )
  return module.exports
}

const { buildWorkspaceRegistration, keepRegistrationLoginCredentials, validateManagerEmail, validateRegistrationPassword, validateRegistrationPasswordFields, validateRegistrationUnits } = loadTs(path.join(__dirname, '../src/utils/workspaceRegistration.ts'))
const { registerWorkspace, WorkspaceRegistrationError } = loadTs(path.join(__dirname, '../src/services/workspaceRegistration.ts'))
const { addManagerEmail, verifyManagerEmail, verifyWorkspaceKey, WorkspaceEmailError, isWorkspaceCodeAlreadySent } = loadTs(path.join(__dirname, '../src/services/workspaceEmail.ts'))
const { readSpreadsheetUnitNames } = loadTs(path.join(__dirname, '../src/utils/spreadsheet.ts'))
const { reconcileSpreadsheetUnits, mergePostalAddress } = loadTs(path.join(__dirname, '../src/utils/workspaceUnits.ts'))
const { lookupPostalCode } = loadTs(path.join(__dirname, '../src/services/postalCode.ts'))
const { ManagerEmailMissingError } = loadTs(path.join(__dirname, '../src/utils/spreadsheetErrors.ts'))
const { createSpreadsheetExampleBlob } = loadTs(path.join(__dirname, '../src/utils/spreadsheetExample.ts'))
const XLSX = require('xlsx')
const originalFetch = global.fetch
const originalSessionStorage = global.sessionStorage
test('modelo para download é um Excel legível com os mesmos cabeçalhos e valores do popup', async () => {
  const example = { columns: [{ label: 'CPF' }, { label: 'NR' }, { label: 'Data de validade' }, { label: '' }],
    rows: [['000.000.000-00', '10', '02/12/2026']] }
  const blob = await createSpreadsheetExampleBlob(example)
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  const book = XLSX.read(await blob.arrayBuffer(), { type: 'array' })
  assert.deepEqual(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 }), [
    ['CPF', 'NR', 'Data de validade'], ['000.000.000-00', '10', '02/12/2026'],
  ])
})
test('senha do cadastro exige oito caracteres, maiúscula, minúscula e número sem exigir símbolo', () => {
  for (const password of ['Senha12', 'senha123', 'SENHA123', 'Senhaabc']) {
    assert.match(validateRegistrationPasswordFields(password, password).password, /8 caracteres.*maiúscula.*minúscula.*número/)
  }
  assert.deepEqual(validateRegistrationPasswordFields('Senha123', 'Senha123'), {})
  assert.deepEqual(validateRegistrationPasswordFields(' Senha123 ', ' Senha123 '), {})
  assert.match(validateRegistrationPasswordFields('A'.repeat(129), 'A'.repeat(129)).password, /128/)
})

test('confirmação divergente tem mensagem própria e não substitui o erro de força da senha', () => {
  assert.deepEqual(validateRegistrationPasswordFields('Senha123', 'Senha124'), { confirmation: 'As senhas não conferem.' })
  const errors = validateRegistrationPasswordFields('teste@teste', 'teste@tes')
  assert.match(errors.password, /maiúscula/)
  assert.equal(errors.confirmation, 'As senhas não conferem.')
  assert.equal(validateRegistrationPasswordFields('Senha123', '').confirmation, 'Confirme sua senha.')
})
test('chave recebida valida pela rota publicada usando o e-mail da solicitação, sem chamar rota ausente', async () => {
  let calls = 0
  global.fetch = async (url, options) => {
    calls++
    assert.equal(url, 'https://astro-api-h2hx.onrender.com/verify-key?tipoConta=GESTOR_WORKSPACE')
    assert.deepEqual(JSON.parse(options.body), { email: 'ana@example.com', accessKey: '012345' })
    return new Response(null, { status: 204 })
  }
  assert.equal(await verifyWorkspaceKey('012345', ' ANA@example.com '), 'ana@example.com')
  assert.equal(calls, 1)
})

test('recusa da rota publicada não confirma e-mail nem tenta outro endpoint', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return new Response(null, { status: 403 }) }
  await assert.rejects(verifyWorkspaceKey('012345', 'ana@example.com'), error => error.status === 403)
  assert.equal(calls, 1)
})

test('rota publicada só aceita 204 e chave incompleta não inicia validação', async () => {
  global.fetch = async () => Response.json({ success: true })
  await assert.rejects(verifyWorkspaceKey('012345', 'ana@example.com'))
  global.fetch = async () => { assert.fail('não deve consultar') }
  await assert.rejects(verifyWorkspaceKey('123', 'ana@example.com'))
})

test('verificação direta envia somente a chave e usa o e-mail confirmado pela API', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://astro-api-h2hx.onrender.com/verify-workspace-key')
    assert.deepEqual(JSON.parse(options.body), { accessKey: '012345' })
    return Response.json({ success: true, data: { email: 'ANA@example.com' } })
  }
  assert.equal(await verifyWorkspaceKey('012345'), 'ana@example.com')
})

test('verificação só pela chave recusa respostas sem e-mail confirmado e endpoint ainda não publicado', async () => {
  for (const data of [{ success: true }, { success: false, data: { email: 'ana@example.com' } }, { success: true, data: { email: 'invalid' } }]) {
    global.fetch = async () => Response.json(data)
    await assert.rejects(verifyWorkspaceKey('012345'), /não confirmou/)
  }
  global.fetch = async () => new Response(null, { status: 404 })
  await assert.rejects(verifyWorkspaceKey('012345'), /verificação.*indisponível/)
})

test('chave inválida não consulta a API e 403 vazio não atribui recusa à chave', async () => {
  global.fetch = async () => { assert.fail('não deve consultar') }
  await assert.rejects(verifyWorkspaceKey('123'))
  global.fetch = async () => new Response(null, { status: 403 })
  await assert.rejects(verifyWorkspaceKey('012345'), error => error.status === 403
    && /serviço de verificação recusou/.test(error.message)
    && !/inválido|substituído|nova chave/.test(error.message))
})

test('preserva o aviso quando a API confirma explicitamente código inválido ou substituído', async () => {
  const message = 'Código inválido ou substituído. Confira seu e-mail novamente e use a nova chave recebida.'
  global.fetch = async () => Response.json({ success: false, message }, { status: 403 })
  await assert.rejects(verifyWorkspaceKey('012345'), error => error.status === 403 && error.message === message)
})
afterEach(() => { global.fetch = originalFetch; global.sessionStorage = originalSessionStorage })

function mockSessionStorage() {
  const values = new Map()
  global.sessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  return values
}

test('reenvio aguarda 30 segundos por e-mail e conserva o prazo depois de recarregar', () => {
  mockSessionStorage()
  const filename = path.resolve(__dirname, '../src/utils/workspaceCodeCooldown.ts')
  const cooldown = loadTs(filename)
  const now = 100000
  assert.equal(cooldown.reserveWorkspaceCodeRequest(' TESTE@empresa.com ', now), true)
  assert.equal(cooldown.reserveWorkspaceCodeRequest('teste@empresa.com', now + 29999), false)
  assert.equal(cooldown.getWorkspaceCodeWait('teste@empresa.com', now + 29999), 1)
  assert.equal(cooldown.reserveWorkspaceCodeRequest('outro@empresa.com', now + 1000), true)
  cache.delete(filename)
  const reloaded = loadTs(filename)
  assert.equal(reloaded.getWorkspaceCodeWait('teste@empresa.com', now + 1000), 29)
  assert.equal(reloaded.reserveWorkspaceCodeRequest('teste@empresa.com', now + 30000), true)
})

test('retomada guarda somente o e-mail e descarta sessões inválidas ou incompatíveis', () => {
  const stored = mockSessionStorage()
  const session = loadTs(path.resolve(__dirname, '../src/utils/workspaceCodeSession.ts'))
  session.saveWorkspaceCodeEmail(' TESTE@empresa.com ')
  assert.equal(session.readWorkspaceCodeEmail(), 'teste@empresa.com')
  assert.deepEqual(JSON.parse(stored.get('astro.workspace-code-session')), { _versao: 1, email: 'teste@empresa.com' })
  stored.set('astro.workspace-code-session', JSON.stringify({ _versao: 2, email: 'teste@empresa.com' }))
  assert.equal(session.readWorkspaceCodeEmail(), '')
  stored.set('astro.workspace-code-session', '{inválido')
  assert.equal(session.readWorkspaceCodeEmail(), '')
  session.saveWorkspaceCodeEmail('')
  assert.equal(stored.has('astro.workspace-code-session'), false)
})

function draft() {
  return {
    email: ' gestor@empresa.com ', password: ' Senha123 ',
    company: { name: ' Empresa ', cnpj: '12.345.678/0001-95' },
    units: [{ id: 1, name: ' Matriz ', cep: '01310-100', state: 'sp', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista', number: '1000', complement: ' Sala 101 ' }],
    file: new File(['conteudo-excel'], 'colaboradores.xlsx'),
  }
}

test('CNPJ valida os dígitos verificadores e bloqueia cadastro inválido antes da API', async () => {
  const { isValidCnpj } = loadTs(path.join(__dirname, '../src/utils/corporateTaxId.ts'))
  const { validateRegistrationCompanyFields } = loadTs(path.join(__dirname, '../src/utils/workspaceRegistration.ts'))
  for (const cnpj of ['11.222.333/0001-81', '04252011000110', '12.345.678/0001-95']) {
    assert.equal(isValidCnpj(cnpj), true, cnpj)
    assert.deepEqual(validateRegistrationCompanyFields({ name: 'Empresa', cnpj }), {})
  }
  let calls = 0
  global.fetch = async () => { calls++; throw new Error('não deve acessar a API') }
  for (const cnpj of ['23.542.345/3252-34', '11222333000180', '11222333000191', ...Array.from({ length: 10 }, (_, digit) => String(digit).repeat(14)), 'abc11222333000181']) {
    assert.equal(isValidCnpj(cnpj), false, cnpj)
    assert.match(validateRegistrationCompanyFields({ name: 'Empresa', cnpj }).cnpj, /CNPJ válido/)
    await assert.rejects(registerWorkspace({ ...draft(), company: { name: 'Empresa', cnpj } }), /CNPJ válido/)
  }
  assert.equal(calls, 0)
  assert.match(validateRegistrationCompanyFields({ name: 'Empresa', cnpj: '123' }).cnpj, /14 dígitos/)
})

test('monta o DTO sem máscaras, sem IDs locais e sem alterar a senha', () => {
  const data = buildWorkspaceRegistration(draft())
  assert.equal(data.email, 'gestor@empresa.com')
  assert.equal(data.password, ' Senha123 ')
  assert.deepEqual(data.workspace, { name: 'Empresa', cnpj: '12345678000195' })
  assert.deepEqual(data.units[0], { name: 'Matriz', cep: '01310100', state: 'SP', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista', number: '1000', addressLine2: 'Sala 101' })
  const input = draft()
  input.units[0].complement = ''
  input.units[0].number = 's/n'
  assert.equal(buildWorkspaceRegistration(input).units[0].number, 's/n')
  assert.ok(!('addressLine2' in buildWorkspaceRegistration(input).units[0]))
})

test('valida credenciais e confirmação sem alterar caracteres da senha', () => {
  assert.ok(validateManagerEmail('gestor@'))
  assert.equal(validateManagerEmail('gestor@empresa.com'), '')
  assert.ok(validateRegistrationPassword('', ''))
  assert.ok(validateRegistrationPassword(' Senha123 ', 'Senha123'))
  assert.equal(validateRegistrationPassword(' Senha123 ', ' Senha123 '), '')
})

test('após criar guarda só credenciais próprias para entrar, sem planilha e dados empresariais', () => {
  const input = draft()
  const saved = keepRegistrationLoginCredentials(input)
  assert.equal(saved.email, input.email.trim())
  assert.equal(saved.password, input.password)
  assert.equal(saved.file, null)
  assert.deepEqual(saved.units, [])
  assert.deepEqual(saved.company, { name: '', cnpj: '' })
  assert.equal(input.file.name, 'colaboradores.xlsx')
})

test('bloqueia unidades vazias, CEP incorreto, nomes duplicados e campos curtos', () => {
  assert.ok(validateRegistrationUnits([]))
  const input = draft()
  input.units.push({ ...input.units[0], id: 2, name: 'matriz' })
  assert.match(validateRegistrationUnits(input.units), /já foi usado/)
  input.units.pop()
  input.units[0].cep = '123'
  assert.match(validateRegistrationUnits(input.units), /CEP/)
  input.units[0].cep = '01310100'
  input.units[0].street = 'A'
  assert.match(validateRegistrationUnits(input.units), /rua/)
})

test('bloqueia arquivo ausente, vazio, formato inválido e acima de 5 MB antes de chamar a API', async () => {
  let calls = 0
  global.fetch = async () => { calls++; throw new Error('Não deveria chamar a API') }
  for (const file of [null, new File([], 'vazio.xlsx'), new File(['csv'], 'dados.csv'), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.xls')]) {
    await assert.rejects(registerWorkspace({ ...draft(), file }), WorkspaceRegistrationError)
  }
  assert.equal(calls, 0)
  assert.doesNotThrow(() => buildWorkspaceRegistration({ ...draft(), file: new File([new Uint8Array(5 * 1024 * 1024)], 'limite.xls') }))
})

test('cadastro exige UF brasileira válida e impede enviar endereço inválido para a API', async () => {
  let calls = 0
  global.fetch = async () => { calls++; throw new Error('não deve acessar a API') }
  for (const state of ['PG', 'XX', 'S', 'São Paulo', '12']) {
    const input = draft(); input.units[0].state = state
    assert.match(validateRegistrationUnits(input.units), /UF brasileira válida/)
    await assert.rejects(registerWorkspace(input), /UF brasileira válida/)
  }
  assert.equal(calls, 0)
  for (const state of 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')) {
    const input = draft(); input.units[0].state = ` ${state.toLowerCase()} `
    assert.equal(validateRegistrationUnits(input.units), '')
    assert.equal(buildWorkspaceRegistration(input).units[0].state, state)
  }
})

test('envia POST público multipart com Blob JSON e planilha original, sem Content-Type manual', async () => {
  const input = draft()
  let calls = 0
  global.fetch = async (url, init) => {
    calls++
    assert.equal(url, 'https://astro-api-h2hx.onrender.com/register-workspace')
    assert.equal(init.method, 'POST')
    assert.deepEqual(init.headers, { Accept: 'application/json' })
    assert.ok(init.body instanceof FormData)
    const data = init.body.get('data')
    assert.equal(data.type, 'application/json')
    assert.deepEqual(JSON.parse(await data.text()), buildWorkspaceRegistration(input))
    assert.equal(init.body.get('file').name, input.file.name)
    assert.equal(await init.body.get('file').text(), await input.file.text())
    return Response.json({ success: true, data: { workspaceId: 123, importErrors: [] } }, { status: 201 })
  }
  assert.deepEqual(await registerWorkspace(input), { workspaceId: 123, importErrors: [] })
  assert.equal(calls, 1)
})

test('bloqueia o limite total de 6 MB quando há muitas unidades junto à planilha', () => {
  const input = draft()
  input.file = new File([new Uint8Array(5 * 1024 * 1024)], 'colaboradores.xlsx')
  input.units = Array.from({ length: 10000 }, (_, index) => ({ ...input.units[0], id: index + 1, name: `Unidade ${index + 1}` }))
  assert.throws(() => buildWorkspaceRegistration(input), /limite de 6 MB/)
})

test('só aceita sucesso com status 201, success true e workspaceId numérico', async () => {
  for (const [status, body] of [[200, { success: true, data: { workspaceId: 1 } }], [201, { success: false }], [201, { success: true, data: {} }]]) {
    global.fetch = async () => Response.json(body, { status })
    await assert.rejects(registerWorkspace(draft()), WorkspaceRegistrationError)
  }
})

test('trata todos os status previstos mesmo quando o servidor não retorna JSON', async () => {
  for (const status of [400, 409, 413, 422, 500, 503]) {
    global.fetch = async () => new Response('erro do proxy', { status })
    await assert.rejects(registerWorkspace(draft()), error => error instanceof WorkspaceRegistrationError && error.status === status && error.message.length > 0)
  }
})

test('preserva mensagem e problemas de importação nos envelopes disponíveis', async () => {
  const errors = [{ row: 4, field: 'cpf', message: 'CPF inválido' }]
  for (const envelope of [{ errors }, { data: errors }, { errors: [], data: errors }, { data: { importErrors: errors } }, { errors: { importErrors: errors } }, { importErrors: errors }]) {
    global.fetch = async () => Response.json({ success: false, message: 'Corrija a planilha', ...envelope }, { status: 422 })
    await assert.rejects(registerWorkspace(draft()), error => {
      assert.equal(error.message, 'Corrija a planilha')
      assert.deepEqual(error.importErrors, errors)
      return true
    })
  }
})

test('mantém os motivos de todas as linhas da planilha sem duplicar erros entre envelopes', async () => {
  const errors = [{ row: 2, field: 'cpf', message: 'CPF já cadastrado' }, { row: 4, field: 'email', message: 'E-mail repetido na planilha' }]
  global.fetch = async () => Response.json({ success: false, message: 'A planilha contém linhas inválidas', errors: ['Corrija as linhas indicadas e envie novamente'], importErrors: errors, data: errors }, { status: 422 })
  await assert.rejects(registerWorkspace(draft()), error => {
    assert.deepEqual(error.importErrors, errors)
    return true
  })
})

test('trata falha de rede sem modificar o rascunho', async () => {
  const input = draft()
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(registerWorkspace(input), /conectar à API/)
  assert.equal(input.password, ' Senha123 ')
  assert.equal(input.file.name, 'colaboradores.xlsx')
  assert.equal(input.units[0].name, ' Matriz ')
})

test('erro de validação mostra o campo e a unidade em vez de ocultar os detalhes da API', async () => {
  for (const errors of [
    [{ field: 'units[0].state', message: 'UF inválida' }, { field: 'workspace.cnpj', defaultMessage: 'CNPJ já cadastrado' }],
    { 'units[0].state': ['UF inválida'], 'workspace.cnpj': 'CNPJ já cadastrado' },
  ]) {
    global.fetch = async () => Response.json({ success: false, message: 'Erro de validação', errors }, { status: 400 })
    await assert.rejects(registerWorkspace(draft()), error => {
      assert.match(error.message, /Unidade 1 · Estado: UF inválida/)
      assert.match(error.message, /Dados da empresa · CNPJ: CNPJ já cadastrado/)
      assert.notEqual(error.message, 'Erro de validação')
      return true
    })
  }
  global.fetch = async () => Response.json({ message: 'Erro de validação', data: [{ field: 'units[1].cep', message: 'CEP inválido' }] }, { status: 422 })
  await assert.rejects(registerWorkspace(draft()), /Unidade 2 · CEP: CEP inválido/)
  global.fetch = async () => Response.json({ message: 'Erro de validação' }, { status: 400 })
  await assert.rejects(registerWorkspace(draft()), /serviço não informou qual campo.*Revise os dados/)
})

test('solicita código com o e-mail do pagamento em POST JSON e aceita 204 vazio', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://astro-api-h2hx.onrender.com/add-manager-email')
    assert.equal(init.method, 'POST')
    assert.deepEqual(init.headers, { Accept: 'application/json', 'Content-Type': 'application/json' })
    assert.deepEqual(JSON.parse(init.body), { email: 'gestor@empresa.com' })
    return new Response(null, { status: 204 })
  }
  await addManagerEmail(' GESTOR@Empresa.com ')
})

test('verifica o código como GESTOR_WORKSPACE, mantendo zeros à esquerda e normalizando o e-mail', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://astro-api-h2hx.onrender.com/verify-key?tipoConta=GESTOR_WORKSPACE')
    assert.equal(init.method, 'POST')
    assert.deepEqual(JSON.parse(init.body), { email: 'gestor@empresa.com', accessKey: '012345' })
    return new Response(null, { status: 204 })
  }
  await verifyManagerEmail(' GESTOR@Empresa.com ', '012345')
})

test('e-mail inválido e código incompleto não fazem requisição', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return new Response(null, { status: 204 }) }
  await assert.rejects(addManagerEmail('gestor@'), /e-mail válido/)
  for (const code of ['', '12345', 'abcdef', '1234567']) {
    await assert.rejects(verifyManagerEmail('gestor@empresa.com', code), /seis dígitos/)
  }
  assert.equal(calls, 0)
})

test('recusa 403 sem corpo orienta conferir o e-mail e usar a nova chave, sem afirmar que toda recusa é substituição', async () => {
  global.fetch = async () => new Response(null, { status: 403 })
  await assert.rejects(verifyManagerEmail('gestor@empresa.com', '012345'), error => error instanceof WorkspaceEmailError && error.status === 403 && error.message === 'Código inválido ou substituído. Confira seu e-mail novamente e use a nova chave recebida.')
})

test('verificação preserva o motivo da recusa informado pelo backend', async () => {
  global.fetch = async () => Response.json({ message: 'Usuário não encontrado para verificar a chave' }, { status: 403 })
  await assert.rejects(verifyManagerEmail('gestor@empresa.com', '012345'), /Usuário não encontrado para verificar a chave/)
})

test('falha de verificação sem JSON mantém mensagem específica mesmo com parâmetro na URL', async () => {
  global.fetch = async () => new Response('erro do proxy', { status: 503 })
  await assert.rejects(verifyManagerEmail('gestor@empresa.com', '012345'), error => error instanceof WorkspaceEmailError && error.status === 503 && /verificar o código/.test(error.message))
})

test('solicitação de e-mail propaga falhas de servidor e rede', async () => {
  global.fetch = async () => Response.json({ message: 'Serviço indisponível' }, { status: 503 })
  await assert.rejects(addManagerEmail('gestor@empresa.com'), /Serviço indisponível/)
  global.fetch = async () => new Response('erro do proxy', { status: 500 })
  await assert.rejects(addManagerEmail('gestor@empresa.com'), /solicitar o código/)
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(addManagerEmail('gestor@empresa.com'), /conectar à API/)
})

test('solicitação preserva aviso de código já enviado em texto, message ou detail', async () => {
  const message = 'Já foi enviado um código para este e-mail. Confira sua caixa de entrada.'
  for (const response of [new Response(message, { status: 400 }), Response.json({ message }, { status: 409 }), Response.json({ detail: message }, { status: 400 })]) {
    global.fetch = async () => response
    await assert.rejects(addManagerEmail('gestor@empresa.com'), error => error instanceof WorkspaceEmailError && error.message === message)
  }
})

test('conflito vazio orienta usar a chave existente sem ocultar erros de verificação', async () => {
  global.fetch = async () => new Response(null, { status: 409 })
  await assert.rejects(addManagerEmail('gestor@empresa.com'), /Já existe uma solicitação.*Verificar/)
  await assert.rejects(verifyManagerEmail('gestor@empresa.com', '012345'), /Não foi possível verificar/)
})

test('popup de código já enviado distingue esse aviso de conta existente e falhas de rede', () => {
  assert.equal(isWorkspaceCodeAlreadySent(new WorkspaceEmailError('Já foi enviado um código para este e-mail.', 400)), true)
  assert.equal(isWorkspaceCodeAlreadySent(new WorkspaceEmailError('A code has already been sent.', 409)), true)
  assert.equal(isWorkspaceCodeAlreadySent(new WorkspaceEmailError('Já existe uma solicitação para este e-mail.', 409)), true)
  assert.equal(isWorkspaceCodeAlreadySent(new WorkspaceEmailError('E-mail já cadastrado.', 409)), false)
  assert.equal(isWorkspaceCodeAlreadySent(new WorkspaceEmailError('Não foi possível conectar à API.', 0)), false)
})

test('404 orienta sobre indisponibilidade em vez de exibir Not Found', async () => {
  global.fetch = async () => Response.json({ detail: 'Not Found' }, { status: 404 })
  await assert.rejects(addManagerEmail('gestor@empresa.com'), error => error.status === 404 && /serviço de envio.*indisponível/.test(error.message))
  await assert.rejects(verifyManagerEmail('gestor@empresa.com', '012345'), /serviço de verificação.*indisponível/)
})

test('requisições possuem limite de espera e timeout não indica código enviado com sucesso', async () => {
  global.fetch = async (_, init) => {
    assert.ok(init.signal instanceof AbortSignal)
    throw new DOMException('Tempo esgotado', 'TimeoutError')
  }
  await assert.rejects(addManagerEmail('gestor@empresa.com'), /Confira se o código chegou.*antes de tentar novamente/)
  await assert.rejects(verifyManagerEmail('gestor@empresa.com', '012345'), /verificação demorou/)
})

function spreadsheet(rows, bookType = 'xlsx', secondSheet) {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Colaboradores')
  if (secondSheet) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(secondSheet), 'Outra aba')
  return new File([XLSX.write(book, { type: 'buffer', bookType })], `colaboradores.${bookType}`)
}

test('extrai unidades da primeira aba em XLS e XLSX, incluindo gestor e ignorando duplicações e linhas vazias', async () => {
  for (const bookType of ['xlsx', 'xls']) {
    const file = spreadsheet([
      ['Nome', ' UNIDADE ', 'Email', 'cpf', 'cargo', 'modalidade'],
      ['Gestor', ' Matriz São Paulo ', 'gestor@empresa.com', '', 'Diretor', ''],
      ['Colaborador', 'matriz sao paulo', 'colaborador@empresa.com', '52998224725', 'Analista', 'REMOTO'],
      [],
      ['Outro', 'Filial Recife', 'outro@empresa.com', '11144477735', 'Analista', 'HIBRIDO'],
    ], bookType, [['unidade'], ['Não importar']])
    assert.deepEqual(await readSpreadsheetUnitNames(file, 'gestor@empresa.com'), ['Matriz São Paulo', 'Filial Recife'])
  }
})

test('bloqueia arquivos inválidos, cabeçalho ausente ou duplicado e unidades vazias antes de avançar', async () => {
  const read = file => readSpreadsheetUnitNames(file, 'gestor@empresa.com')
  await assert.rejects(read(new File(['arquivo inválido'], 'dados.xlsx')), /Excel.*válida/)
  await assert.rejects(read(spreadsheet([['nome'], ['Gestor']])), /coluna chamada "unidade"/)
  await assert.rejects(read(spreadsheet([['unidade', 'UNIDADE'], ['Matriz', 'Matriz']])), /única coluna/)
  const header = ['nome', 'cpf', 'email', 'unidade', 'cargo', 'modalidade']
  await assert.rejects(read(spreadsheet([header, ['Gestor', '', 'gestor@empresa.com', '', 'Diretor', '']])), /Linha 2.*unidade/)
  await assert.rejects(read(spreadsheet([header])), error => error instanceof ManagerEmailMissingError)
  await assert.rejects(read(spreadsheet([header, ['Gestor', '', 'gestor@empresa.com', 'A'.repeat(81), 'Diretor', '']])), /2 a 80/)
})

test('localiza gestor pelo e-mail do cadastro com espaços e maiúsculas, em cabeçalhos reordenados e normalizados', async () => {
  const file = spreadsheet([
    [' Cárgo ', ' EMAIL ', 'Modalidade', 'Unidade', 'CPF', 'Nóme'],
    ['Diretor', ' GESTOR@EMPRESA.COM ', '', 'Matriz', '', 'Gestor Teste'],
  ])
  assert.deepEqual(await readSpreadsheetUnitNames(file, ' Gestor@Empresa.com '), ['Matriz'])
})

test('gestor precisa estar na primeira aba e corresponder ao e-mail do cadastro', async () => {
  const header = ['nome', 'cpf', 'email', 'unidade', 'cargo', 'modalidade']
  const file = spreadsheet([header, ['Pessoa', '', 'outro@empresa.com', 'Matriz', 'Analista', 'REMOTO']], 'xlsx', [header, ['Gestor', '', 'gestor@empresa.com', 'Matriz', 'Diretor', '']])
  await assert.rejects(readSpreadsheetUnitNames(file, 'gestor@empresa.com'), error => error instanceof ManagerEmailMissingError)
  await assert.rejects(readSpreadsheetUnitNames(file, ''), /e-mail do gestor no cadastro/)
})

test('gestor duplicado bloqueia avanço e informa as linhas reais, incluindo linhas vazias', async () => {
  const file = spreadsheet([
    [],
    ['nome', 'cpf', 'email', 'unidade', 'cargo', 'modalidade'],
    ['Gestor', '', 'gestor@empresa.com', 'Matriz', 'Diretor', ''],
    [],
    ['Gestor', '', ' GESTOR@EMPRESA.COM ', 'Matriz', 'Diretor', ''],
  ])
  await assert.rejects(readSpreadsheetUnitNames(file, 'gestor@empresa.com'), /mais de uma vez.*linhas 3, 5/)
})

test('valida nome e cargo do gestor e aceita CPF e modalidade opcionais vazios', async () => {
  const header = ['nome', 'cpf', 'email', 'unidade', 'cargo', 'modalidade']
  for (const [index, field] of [[0, 'nome'], [4, 'cargo']]) {
    const row = ['Gestor', '', 'gestor@empresa.com', 'Matriz', 'Diretor', '']
    row[index] = ' '
    await assert.rejects(readSpreadsheetUnitNames(spreadsheet([header, [], row]), 'gestor@empresa.com'), new RegExp(`Linha 3: preencha o ${field} do gestor`))
  }
  assert.deepEqual(await readSpreadsheetUnitNames(spreadsheet([header, ['Gestor', '', 'gestor@empresa.com', 'Matriz', 'Diretor', '']]), 'gestor@empresa.com'), ['Matriz'])
})

test('exige todos os cabeçalhos do cadastro e bloqueia colunas ambíguas', async () => {
  const header = ['nome', 'cpf', 'email', 'unidade', 'cargo', 'modalidade']
  for (const field of header) {
    await assert.rejects(readSpreadsheetUnitNames(spreadsheet([header.filter(column => column !== field)]), 'gestor@empresa.com'), new RegExp(`coluna chamada "${field}"`))
    await assert.rejects(readSpreadsheetUnitNames(spreadsheet([[...header, field.toUpperCase()]]), 'gestor@empresa.com'), new RegExp(`única coluna chamada "${field}"`))
  }
})

test('valida todos os campos dos colaboradores e informa a linha real antes de avançar', async () => {
  const header = ['nome', 'cpf', 'email', 'unidade', 'cargo', 'modalidade']
  const manager = ['Gestor', '', 'gestor@empresa.com', 'Matriz', 'Diretor', '']
  const person = ['Pessoa', '529.982.247-25', 'pessoa@empresa.com', 'Matriz', 'Analista', 'Híbrido']
  for (const [column, value, message] of [
    [0, '', /nome/], [0, 'A'.repeat(256), /nome/],
    [1, '111.111.111-11', /CPF/], [1, '52998224724', /CPF/],
    [2, 'email-invalido', /e-mail/], [2, '', /e-mail/],
    [4, '', /cargo/], [4, 'A'.repeat(256), /cargo/],
    [5, '', /modalidade/], [5, 'Inexistente', /modalidade/],
  ]) {
    const invalid = [...person]; invalid[column] = value
    await assert.rejects(readSpreadsheetUnitNames(spreadsheet([header, manager, [], invalid]), 'gestor@empresa.com'), error => {
      assert.match(error.message, /Linha 4:/)
      assert.match(error.message, message)
      return true
    })
  }
  for (const cpf of ['529.982.247-25', '52998224725', ' 529.982.247-25 ', '529 982 247 25']) {
    const formattedPerson = [...person]; formattedPerson[1] = cpf
    assert.deepEqual(await readSpreadsheetUnitNames(spreadsheet([header, manager, formattedPerson]), 'gestor@empresa.com'), ['Matriz'])
  }
})

test('bloqueia duplicação de e-mail e CPF na planilha e dados opcionais inválidos do gestor', async () => {
  const header = ['nome', 'cpf', 'email', 'unidade', 'cargo', 'modalidade']
  const manager = ['Gestor', '', 'gestor@empresa.com', 'Matriz', 'Diretor', '']
  const person = ['Pessoa', '52998224725', 'pessoa@empresa.com', 'Matriz', 'Analista', 'Presencial']
  for (const [row, message] of [
    [['Outra', '11144477735', ' PESSOA@EMPRESA.COM ', 'Matriz', 'Analista', 'Remoto'], /e-mail duplicado.*linha 3/],
    [['Outra', '529.982.247-25', 'outra@empresa.com', 'Matriz', 'Analista', 'Remoto'], /CPF duplicado.*linha 3/],
  ]) await assert.rejects(readSpreadsheetUnitNames(spreadsheet([header, manager, person, row]), manager[2]), message)
  for (const [column, value, message] of [[1, '00000000000', /Linha 2.*CPF válido/], [5, 'Inválida', /Linha 2.*modalidade/]]) {
    const invalid = [...manager]; invalid[column] = value
    await assert.rejects(readSpreadsheetUnitNames(spreadsheet([header, invalid]), manager[2]), message)
  }
  const sameCpf = [...manager]; sameCpf[1] = '529.982.247-25'
  await assert.rejects(readSpreadsheetUnitNames(spreadsheet([header, sameCpf, person]), manager[2]), /CPF duplicado.*linha 2/)
})

test('consulta e-mails antes do cadastro e identifica linha de contas existentes em qualquer perfil', async () => {
  const { validateRegistrationEmails } = loadTs(path.join(__dirname, '../src/services/registrationValidation.ts'))
  const rows = ['novo', 'gestor', 'colaborador', 'admin'].map((email, index) => ({ row: index + 2, email: `${email}@empresa.com` }))
  const calls = []
  global.fetch = async (url, init) => {
    calls.push({ url, ...init })
    const { email } = JSON.parse(init.body)
    return email.startsWith('novo') ? Response.json({ success: false, message: 'E-mail não cadastrado' }, { status: 404 })
      : Response.json({ success: true, data: { userType: email.startsWith('gestor') ? 'GESTOR' : email.startsWith('admin') ? 'ADMIN' : 'COLABORADOR' } })
  }
  const errors = await validateRegistrationEmails(rows, new AbortController().signal)
  assert.deepEqual(errors.map(error => [error.row, error.field]), [[3, 'email'], [4, 'email'], [5, 'email']])
  assert.ok(errors.every(error => /já cadastrado/.test(error.message)))
  assert.equal(calls.length, 4)
  assert.ok(calls.every(call => call.url.endsWith('/verify-email') && call.method === 'POST'))
  assert.ok(calls.every(call => !call.url.includes('add-manager-email') && !call.url.includes('register-workspace')))
})

test('falha, resposta inválida e cancelamento não confirmam disponibilidade de e-mail', async () => {
  const { validateRegistrationEmails } = loadTs(path.join(__dirname, '../src/services/registrationValidation.ts'))
  const rows = [{ row: 2, email: 'pessoa@empresa.com' }]
  for (const response of [new Response('', { status: 503 }), Response.json({ success: false }), Response.json({ success: true, data: {} })]) {
    global.fetch = async () => response
    await assert.rejects(validateRegistrationEmails(rows, new AbortController().signal), /Não foi possível verificar os e-mails/)
  }
  let calls = 0
  global.fetch = async () => { calls++; throw new Error('não deve chamar') }
  const controller = new AbortController(); controller.abort()
  await assert.rejects(validateRegistrationEmails(rows, controller.signal), error => error.name === 'AbortError')
  assert.equal(calls, 0)
})

test('nova planilha preserva endereços de unidades equivalentes e remove unidades que saíram do arquivo', () => {
  const previous = [{ ...draft().units[0], name: 'Matriz São Paulo' }, { ...draft().units[0], id: 2, name: 'Unidade antiga' }]
  const units = reconcileSpreadsheetUnits(['matriz sao paulo', 'Filial'], previous)
  assert.equal(units[0].id, 1)
  assert.equal(units[0].street, 'Avenida Paulista')
  assert.equal(units[0].name, 'matriz sao paulo')
  assert.equal(units[1].id, 3)
  assert.equal(units[1].cep, '')
  assert.equal(units.length, 2)
  assert.equal(previous[0].name, 'Matriz São Paulo')
})

test('nova leitura preserva unidades manuais e protege unidade manual que passou a constar na planilha', () => {
  const previous = [
    { ...draft().units[0], source: 'spreadsheet' },
    { ...draft().units[0], id: 2, name: 'Unidade extra', source: 'manual' },
  ]
  const first = reconcileSpreadsheetUnits(['Matriz', 'Filial'], previous)
  assert.equal(first.length, 3)
  assert.equal(first[0].source, 'spreadsheet')
  assert.equal(first[1].source, 'spreadsheet')
  assert.equal(first[2].source, 'manual')
  assert.equal(first[2].id, 2)
  const second = reconcileSpreadsheetUnits(['Matriz', ' UNIDADE EXTRA '], first)
  assert.equal(second.length, 2)
  assert.equal(second[1].id, 2)
  assert.equal(second[1].source, 'spreadsheet')
  assert.equal(previous[1].source, 'manual')
})

test('unidade extra segue no cadastro com endereço, sem metadados locais ou vínculo fictício', () => {
  const input = draft()
  input.units[0].source = 'spreadsheet'
  input.units.push({ ...input.units[0], id: 2, name: 'Unidade extra', source: 'manual' })
  const data = buildWorkspaceRegistration(input)
  assert.equal(data.units.length, 2)
  assert.equal(data.units[1].name, 'Unidade extra')
  assert.equal(data.units[1].city, 'São Paulo')
  for (const field of ['source', 'id', 'roles', 'collaborators', 'users']) assert.equal(field in data.units[1], false)
  input.units[1].name = 'Mátriz'
  assert.match(validateRegistrationUnits(input.units), /já foi usado/)
})

test('consulta ViaCEP com CEP sem máscara e retorna somente os campos de endereço', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://viacep.com.br/ws/01310100/json/')
    assert.ok(init.signal instanceof AbortSignal)
    return Response.json({ uf: 'SP', localidade: 'São Paulo', bairro: ' Bela Vista ', logradouro: 'Avenida Paulista', complemento: 'lado par', ibge: '3550308' })
  }
  assert.deepEqual(await lookupPostalCode('01310-100'), { state: 'SP', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista' })
})

test('CEP incompleto não consulta a rede; CEP inexistente, rede e resposta inválida permitem preenchimento manual', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return Response.json({ erro: true }) }
  await assert.rejects(lookupPostalCode('123'), /oito dígitos/)
  assert.equal(calls, 0)
  await assert.rejects(lookupPostalCode('00000000'), /não encontrado.*manualmente/)
  global.fetch = async () => Response.json({ inesperado: true })
  await assert.rejects(lookupPostalCode('01310100'), /resposta inválida.*manualmente/)
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(lookupPostalCode('01310100'), /consultar o CEP.*manualmente/)
  global.fetch = async () => new Response('indisponível', { status: 503 })
  await assert.rejects(lookupPostalCode('01310100'), /indisponível.*manualmente/)
})

test('CEP geral pode retornar bairro e rua vazios para preencher manualmente', async () => {
  global.fetch = async () => Response.json({ uf: 'SP', localidade: 'São Paulo', bairro: '', logradouro: '' })
  assert.deepEqual(await lookupPostalCode('01310100'), { state: 'SP', city: 'São Paulo', neighborhood: '', street: '' })
})

test('autopreenchimento não altera outra unidade, CEP mais recente ou campos editados durante a consulta', () => {
  const requested = draft().units[0]
  const result = { state: 'RJ', city: 'Rio de Janeiro', neighborhood: 'Centro', street: 'Rua encontrada' }
  const current = { ...requested, street: 'Rua digitada', number: '200', complement: 'Sala 2' }
  const merged = mergePostalAddress(current, requested, result)
  assert.equal(merged.state, 'RJ')
  assert.equal(merged.street, 'Rua digitada')
  assert.equal(merged.number, '200')
  assert.equal(merged.complement, 'Sala 2')
  const differentCep = { ...current, cep: '01001-000' }
  assert.equal(mergePostalAddress(differentCep, requested, result), differentCep)
  const otherUnit = { ...current, id: 2 }
  assert.equal(mergePostalAddress(otherUnit, requested, result), otherUnit)
  assert.equal(current.state, 'sp')
})
