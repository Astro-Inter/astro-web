const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Carrega os utilitários TypeScript sem introduzir um segundo bundler no projeto.
const cache = new Map()
function loadTs(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'module', 'exports', code)(
    specifier => specifier.startsWith('.') ? loadTs(path.resolve(path.dirname(filename), `${specifier}.ts`)) : require(specifier),
    module, module.exports,
  )
  return module.exports
}
const { validateEventEdit, startedGroupIds, calendarEntriesForEvent, numberEventsByDay } = loadTs(path.join(__dirname, '../src/utils/eventEditing.ts'))
const original = {
  creatorId: 'creator',
  draft: { title: 'Treinamento', description: 'Descrição', externalLink: '', nr: 'NR 10', type: 'Evento' },
  settings: { completion: 'manual', evidenceRequired: 'yes' },
  groups: [{ id: 'g1', name: 'Turma 1' }, { id: 'g2', name: 'Turma 2' }],
  selectedIds: ['a', 'b'], assignments: { a: 'g1', b: 'g2' },
  schedules: {
    g1: { date: '2026-10-08', startTime: '10:00', endTime: '11:00' },
    g2: { date: '2026-10-09', startTime: '10:00', endTime: '11:00' },
  },
}
const before = new Date('2026-10-08T09:59:59').getTime()
const started = new Date('2026-10-08T10:00:00').getTime()
function edit(change, now = before, manager = 'creator') {
  const value = structuredClone(original)
  change(value)
  return validateEventEdit(original, value, manager, now)
}

test('criador pode editar informações e turmas futuras antes do início', () => {
  assert.equal(edit(v => { v.draft.title = 'Novo título'; v.draft.description = 'Nova descrição'; v.draft.externalLink = 'https://example.com'; v.schedules.g1.startTime = '10:30'; v.assignments.b = 'g1' }), null)
})
test('gestor diferente não pode salvar alterações', () => assert.match(edit(() => {}, before, 'other'), /gestor criador/))
test('NR, conclusão, evidência e criador são imutáveis desde a criação', () => {
  for (const change of [v => v.draft.nr = 'NR 12', v => v.settings.completion = 'auto', v => v.settings.evidenceRequired = 'no', v => v.creatorId = 'other']) {
    assert.match(edit(change), /não podem ser alterados/)
  }
})
test('o limite de início é inclusivo e bloqueia dados gerais', () => {
  assert.deepEqual(startedGroupIds(original, before), [])
  assert.deepEqual(startedGroupIds(original, started), ['g1'])
  for (const field of ['title', 'description', 'externalLink']) assert.match(edit(v => v.draft[field] = 'alterado', started), /já começou/)
})
test('todos os horários e participantes da turma iniciada ficam bloqueados', () => {
  for (const [field, value] of [['date', '2026-10-10'], ['startTime', '12:00'], ['endTime', '13:00']]) {
    assert.match(edit(v => v.schedules.g1[field] = value, started), /Data e horários/)
  }
  for (const change of [v => v.assignments.a = 'g2', v => v.assignments.b = 'g1', v => v.selectedIds = ['b']]) {
    assert.match(edit(change, started), /participantes/)
  }
})
test('turma futura continua editável quando outra turma já começou', () => {
  assert.equal(edit(v => { v.schedules.g2.date = '2026-10-10'; v.selectedIds.push('c'); v.assignments.c = 'g2' }, started), null)
})
test('estrutura de turmas não pode ser recriada na edição', () => assert.match(edit(v => v.groups.pop()), /turmas/))
test('entradas das turmas preservam número, criador e inativação do mesmo evento', () => {
  const entries = calendarEntriesForEvent(original, 'event-1', 'event', 7, true)
  assert.equal(entries.length, 2)
  assert.ok(entries.every(e => e.eventId === 'event-1' && e.eventNumber === 7 && e.inactive && e.configuration.creatorId === 'creator'))
})
test('numeração reinicia por dia, inclui inativos e ignora o marcador de hoje', () => {
  const entry = (id, date, inactive = false) => ({ id, date, title: id, category: 'event', startTime: '10:00', endTime: '11:00', inactive })
  const numbered = numberEventsByDay([
    { id: 'today', category: 'today', date: '2026-10-08', title: 'Dia atual' },
    entry('a', '2026-10-08'), entry('b', '2026-10-09'), entry('c', '2026-10-08', true), entry('d', '2026-10-09'),
  ])
  assert.deepEqual(numbered.map(e => e.eventNumber), [undefined, 1, 1, 2, 2])
})
