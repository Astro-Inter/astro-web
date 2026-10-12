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

const { buildWorkspaceRegistration, validateManagerEmail, validateRegistrationPassword, validateRegistrationUnits } = loadTs(path.join(__dirname, '../src/utils/workspaceRegistration.ts'))
const { registerWorkspace, WorkspaceRegistrationError } = loadTs(path.join(__dirname, '../src/services/workspaceRegistration.ts'))
const { addManagerEmail, verifyManagerEmail, WorkspaceEmailError } = loadTs(path.join(__dirname, '../src/services/workspaceEmail.ts'))
const { readSpreadsheetUnitNames } = loadTs(path.join(__dirname, '../src/utils/spreadsheet.ts'))
const { reconcileSpreadsheetUnits, mergePostalAddress } = loadTs(path.join(__dirname, '../src/utils/workspaceUnits.ts'))
const { lookupPostalCode } = loadTs(path.join(__dirname, '../src/services/postalCode.ts'))
const XLSX = require('xlsx')
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch })

function draft() {
  return {
    email: ' gestor@empresa.com ', password: ' Senha123 ',
    company: { name: ' Empresa ', cnpj: '12.345.678/0001-90' },
    units: [{ id: 1, name: ' Matriz ', cep: '01310-100', state: 'sp', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista', number: '1000', complement: ' Sala 101 ' }],
    file: new File(['conteudo-excel'], 'colaboradores.xlsx'),
  }
}

test('monta o DTO sem máscaras, sem IDs locais e sem alterar a senha', () => {
  const data = buildWorkspaceRegistration(draft())
  assert.equal(data.email, 'gestor@empresa.com')
  assert.equal(data.password, ' Senha123 ')
  assert.deepEqual(data.workspace, { name: 'Empresa', cnpj: '12345678000190' })
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
  for (const envelope of [{ errors }, { data: { importErrors: errors } }, { errors: { importErrors: errors } }, { importErrors: errors }]) {
    global.fetch = async () => Response.json({ success: false, message: 'Corrija a planilha', ...envelope }, { status: 422 })
    await assert.rejects(registerWorkspace(draft()), error => {
      assert.equal(error.message, 'Corrija a planilha')
      assert.deepEqual(error.importErrors, errors)
      return true
    })
  }
})

test('trata falha de rede sem modificar o rascunho', async () => {
  const input = draft()
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(registerWorkspace(input), /conectar à API/)
  assert.equal(input.password, ' Senha123 ')
  assert.equal(input.file.name, 'colaboradores.xlsx')
  assert.equal(input.units[0].name, ' Matriz ')
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

test('recusa 403 sem corpo informa a resposta da API, sem assumir que o código expirou', async () => {
  global.fetch = async () => new Response(null, { status: 403 })
  await assert.rejects(verifyManagerEmail('gestor@empresa.com', '012345'), error => error instanceof WorkspaceEmailError && error.status === 403 && /API recusou/.test(error.message))
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
  await assert.rejects(read(spreadsheet([header])), /Inclua.*e-mail do gestor/)
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
  await assert.rejects(readSpreadsheetUnitNames(file, 'gestor@empresa.com'), /Inclua.*gestor@empresa.com/)
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

test('valida nome e cargo do gestor sem exigir CPF ou modalidade que a API não grava para ele', async () => {
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
