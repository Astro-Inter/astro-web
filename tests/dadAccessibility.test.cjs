const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { JSDOM } = require('jsdom')

function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}

test('Tab e Shift+Tab ficam no dialog ativo sem interferir nos controles intermediários', () => {
  const dom = new JSDOM('<dialog open><h2 tabindex="-1">Editar</h2><button id="first">Primeiro</button><button id="middle">Meio</button><details><summary id="details">Opções avançadas</summary></details><button disabled>Desabilitado</button><button id="last">Último</button></dialog>')
  const previous = global.document
  global.document = dom.window.document
  dom.window.HTMLElement.prototype.getClientRects = () => [{}]
  try {
    const { containDialogTab } = load('src/utils/dialogFocus.ts')
    const dialog = document.querySelector('dialog'), heading = document.querySelector('h2')
    const key = shiftKey => new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true })
    document.getElementById('last').focus()
    const forward = key(false); containDialogTab(forward, dialog, heading)
    assert.equal(forward.defaultPrevented, true)
    assert.equal(document.activeElement.id, 'first')
    const backward = key(true); containDialogTab(backward, dialog, heading)
    assert.equal(backward.defaultPrevented, true)
    assert.equal(document.activeElement.id, 'last')
    document.getElementById('middle').focus()
    const middle = key(false); containDialogTab(middle, dialog, heading)
    assert.equal(middle.defaultPrevented, false)
    document.getElementById('details').focus()
    const summary = key(false); containDialogTab(summary, dialog, heading)
    assert.equal(summary.defaultPrevented, false)
    const nested = document.createElement('dialog'); nested.open = true; document.body.append(nested)
    document.getElementById('last').focus()
    const parent = key(false); containDialogTab(parent, dialog, heading)
    assert.equal(parent.defaultPrevented, false)
  } finally { global.document = previous; dom.window.close() }
})

test('fechar popup devolve foco; excluir origem usa título e preserva foco de outro dialog', () => {
  const dom = new JSDOM('<main><h1>Dashboards</h1><button id="origin">Excluir</button></main><div id="popup"><button>Confirmar</button></div>')
  const previous = global.document
  global.document = dom.window.document
  try {
    const { restoreFocus } = load('src/utils/restoreFocus.ts')
    const origin = document.getElementById('origin'), popup = document.getElementById('popup')
    popup.querySelector('button').focus()
    restoreFocus(origin, popup)
    assert.equal(document.activeElement, origin)
    popup.querySelector('button').focus()
    origin.remove()
    restoreFocus(origin, popup)
    assert.equal(document.activeElement, document.querySelector('h1'))
    const nested = document.createElement('dialog')
    nested.open = true
    nested.innerHTML = '<button>Nova ação</button>'
    document.body.append(nested)
    nested.querySelector('button').focus()
    restoreFocus(origin, popup)
    assert.equal(document.activeElement, nested.querySelector('button'))
    popup.querySelector('button').focus()
    restoreFocus(origin, popup)
    assert.equal(document.activeElement, nested.querySelector('button'))
  } finally { global.document = previous; dom.window.close() }
})

function luminance(color) {
  const rgb = color.replace('#', '').match(/\w\w/g).map(hex => parseInt(hex, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
}
function contrast(a, b) {
  const left = luminance(a), right = luminance(b)
  return (Math.max(left, right) + .05) / (Math.min(left, right) + .05)
}

test('tokens de texto, campos, erros e botões mantêm contraste AA nos fundos compartilhados', () => {
  const css = fs.readFileSync('styles/global.css', 'utf8')
  const token = name => css.match(new RegExp(`--astro-${name}:\\s*(#[a-f0-9]{6})`, 'i'))[1]
  const loginCss = fs.readFileSync('styles/login.css', 'utf8')
  assert.match(loginCss, /\.login-field-error\s*\{[^}]*\bcolor:\s*var\(--astro-error-text\)/)
  assert.match(loginCss, /input\[aria-invalid="true"\][^{]*\{\s*border-color:\s*var\(--astro-primary-error\)/)
  for (const foreground of ['text', 'text-muted', 'placeholder', 'error-text']) {
    for (const background of ['background', 'popup-background', 'field']) {
      assert.ok(contrast(token(foreground), token(background)) >= 4.5, `${foreground} / ${background}`)
    }
  }
  for (const background of ['orb-accent', 'orb-accent-hover', 'danger', 'danger-hover']) {
    assert.ok(contrast('#ffffff', token(background)) >= 4.5, `botão ${background}`)
  }
  const modalCss = fs.readFileSync('styles/appModal.css', 'utf8')
  const cancel = modalCss.match(/\.astro-modal-cancel\s*\{[^}]*background:\s*(#[a-f0-9]{6})/i)[1]
  assert.ok(contrast(token('text'), cancel) >= 4.5, 'cancelar')
  assert.ok(contrast('#ffffff', '#458f51') >= 3, 'ícone de sucesso')
  const calendarCss = fs.readFileSync('styles/mainEventScreen.css', 'utf8')
  const outsideDay = calendarCss.match(/\.event-calendar-day--outside \.event-calendar-day-number\s*\{\s*color:\s*(#[a-f0-9]{6})/i)[1]
  assert.ok(contrast(outsideDay, '#211b40') >= 4.5, 'dias fora do mês')
  const optionsCss = fs.readFileSync('styles/optionsPopup.css', 'utf8')
  assert.match(optionsCss, /\.astro-options-popup-item--danger\s*\{\s*color:\s*var\(--astro-error-text\)/)
  const dangerFocus = optionsCss.match(/\.astro-options-popup-item--danger:focus-visible\s*\{\s*color:\s*(#[a-f0-9]{6})/i)[1]
  assert.ok(contrast(dangerFocus, token('popup-background')) >= 4.5, 'excluir com foco')
  const calendarColors = [...calendarCss.matchAll(/\.event-calendar-item--(?:scheduled|today|in-progress)\s*\{\s*background:\s*(#[a-f0-9]{6})/gi)]
  assert.equal(calendarColors.length, 3)
  for (const [, background] of calendarColors) assert.ok(contrast('#ffffff', background) >= 4.5, `evento ${background}`)
  // O contorno translúcido precisa contrastar com a superfície sob ele, não com branco puro.
  const ring = css.match(/--astro-focus-border:\s*rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)%\)/).slice(1).map(Number)
  for (const background of ['#6c5994', '#6d5a96', token('background')]) {
    const rgb = background.slice(1).match(/../g).map(hex => parseInt(hex, 16))
    const blended = '#' + rgb.map((value, index) => Math.round(ring[index] * ring[3] / 100 + value * (1 - ring[3] / 100)).toString(16).padStart(2, '0')).join('')
    assert.ok(contrast(blended, background) >= 3, `foco ${background}`)
  }
})

test('cancelamento normaliza justificativa e bloqueia vazios e excesso antes de enviar', () => {
  const { validateEventCancellation } = load('src/utils/eventCancellation.ts')
  for (const reason of ['', '   ', 'ab', 'a'.repeat(1001)]) {
    const result = validateEventCancellation(reason)
    assert.equal(result.values, null)
    assert.match(result.errors.reason, /3 a 1000/)
  }
  assert.deepEqual(validateEventCancellation('  Reagendado  '), { values: { reason: 'Reagendado' }, errors: {} })
})

test('persistência do VLibras migra legado, mantém preferências e descarta versões incompatíveis', () => {
  const { parseLibrasWidgetStorage } = load('src/utils/librasStorage.ts')
  const original = { state: { isOpen: true, avatar: 'icaro', speed: 2 }, settings: { position: 'R' } }
  const migrated = parseLibrasWidgetStorage(JSON.stringify(original))
  assert.deepEqual(migrated, { ...original, _versao: 1, state: { ...original.state, isOpen: false } })
  assert.equal(original.state.isOpen, true)
  assert.deepEqual(parseLibrasWidgetStorage(JSON.stringify(migrated)), migrated)
  for (const raw of [null, '{', '[]', '{}', '{"state":{"isOpen":"false"}}', '{"_versao":2,"state":{"isOpen":true}}']) {
    assert.equal(parseLibrasWidgetStorage(raw), null)
  }
})
