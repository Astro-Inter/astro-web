const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function load(filename, resolve = require) {
  const module = { exports: {} }
  const source = fs.readFileSync(path.join(__dirname, '../src', filename), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const imports = name => name.endsWith('.css?raw') ? fs.readFileSync(path.resolve(__dirname, '../src', path.dirname(filename), name.replace('?raw', '')), 'utf8') : name.endsWith('.svg?url') ? '/assets/librasHands.svg' : name === '../utils/librasStorage' ? load('utils/librasStorage.ts') : resolve(name)
  new Function('require', 'module', 'exports', code)(imports, module, module.exports)
  return module.exports
}
const preferences = load('utils/accessibility.ts')
const shortcuts = load('utils/accessibilityShortcuts.ts', () => preferences)
const face = load('utils/faceNavigation.ts')
const voice = load('services/voiceSearch.ts')
const camera = load('services/faceNavigation.ts', name => name === './faceNavigationWorkerClient' ? {} : require(name))
test('worker limita imagens em voo e cancelamento termina a análise pendente', async () => {
  const keys = ['Worker', 'createImageBitmap', 'OffscreenCanvas']
  const descriptors = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(global, key)]))
  let instance, terminated = 0
  class MockWorker {
    constructor() { instance = this; this.posts = [] }
    postMessage(message) { this.posts.push(message); if (message.type === 'init') queueMicrotask(() => this.onmessage({ data: { type: 'ready' } })) }
    terminate() { terminated++ }
  }
  for (const [key, value] of Object.entries({ Worker: MockWorker, OffscreenCanvas: class {}, createImageBitmap: async () => ({ close() {} }) })) Object.defineProperty(global, key, { value, configurable: true })
  try {
    const client = load('services/faceNavigationWorkerClient.ts', () => MockWorker)
    const controller = new AbortController()
    const detector = await client.startFaceWorker(controller.signal)
    const pending = detector.detectForVideo({}, 100)
    await Promise.resolve()
    await assert.rejects(detector.detectForVideo({}, 101), /imagem em análise/)
    assert.equal(instance.posts.filter(message => message.type === 'frame').length, 1)
    const rejection = assert.rejects(pending, { name: 'AbortError' })
    controller.abort()
    await rejection
    assert.equal(terminated, 1)
    instance.onmessage({ data: { type: 'result', result: { faceLandmarks: [] } } })
    detector.close()
    assert.equal(terminated, 1)
  } finally {
    for (const key of keys) { if (descriptors[key]) Object.defineProperty(global, key, descriptors[key]); else delete global[key] }
  }
})
test('VLibras aceita somente esquerda e direita e recupera posições antigas', () => {
  for (const position of ['L', 'R']) assert.equal(preferences.normalizeAccessibility({ librasPosition: position }).librasPosition, position)
  for (const position of ['T', 'B', 'invalid']) assert.equal(preferences.normalizeAccessibility({ librasPosition: position }).librasPosition, 'L')
})

test('reavaliar integração reaproveita SDK e remove launchers duplicados', async () => {
  const names = ['window', 'document', 'MutationObserver']
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  const root = { hidden: false }
  const instances = ['vlibras-access-wrapper', 'vlibras-app-root'].flatMap(id => [0, 1].map(() => ({
    id, parentElement: root, dataset: {}, removed: false, remove() { this.removed = true },
  })))
  let constructors = 0
  global.window = { VLibras: { Widget: class { constructor() { constructors++ } } }, dispatchEvent() {} }
  global.document = {
    body: {},
    getElementById: id => id === 'astro-libras' ? root : instances.find(element => element.id === id && !element.removed),
    querySelectorAll: selector => instances.filter(element => !element.removed && selector === `[id="${element.id}"]`),
    createElement() { assert.fail('SDK já existe; não deve injetar outro script') },
  }
  global.MutationObserver = class { observe() {} disconnect() {} }
  try {
    for (let i = 0; i < 2; i++) {
      const integration = load('services/libras.ts')
      await integration.enableLibras('L', new AbortController().signal)
    }
    assert.equal(constructors, 0)
    assert.equal(instances.filter(element => !element.removed && element.id === 'vlibras-access-wrapper').length, 1)
    assert.equal(instances.filter(element => !element.removed && element.id === 'vlibras-app-root').length, 1)
  } finally {
    for (const name of names) { if (previous[name]) Object.defineProperty(global, name, previous[name]); else delete global[name] }
  }
})

test('atalhos reconhecem tecla física e ignoram repetição, composição e AltGr', () => {
  const alt = { key: 'a', code: 'KeyA', altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, repeat: false, isComposing: false }
  assert.equal(shortcuts.matchesAccessibilityShortcut(alt, 'alt', 'a'), true)
  assert.equal(shortcuts.matchesAccessibilityShortcut({ ...alt, key: 'å' }, 'alt', 'a'), true)
  for (const change of [{ repeat: true }, { isComposing: true }, { shiftKey: true }, { ctrlKey: true }, { metaKey: true }, { getModifierState: () => true }]) {
    assert.equal(shortcuts.matchesAccessibilityShortcut({ ...alt, ...change }, 'alt', 'a'), false)
  }
  for (const key of ['ArrowLeft', 'ArrowRight']) {
    assert.equal(shortcuts.matchesAccessibilityShortcut({ ...alt, key, code: key, altKey: false, ctrlKey: true }, 'ctrl', key), true)
  }
})

test('Ctrl com setas preserva campos editáveis dentro de Shadow DOM', () => {
  const previous = global.HTMLElement
  global.HTMLElement = class { constructor(editable) { this.isContentEditable = editable } matches() { return false } }
  try {
    const host = new global.HTMLElement(false), field = new global.HTMLElement(true)
    assert.equal(shortcuts.isEditingShortcutTarget({ target: host, composedPath: () => [field, host] }), true)
    assert.equal(shortcuts.isEditingShortcutTarget({ target: host, composedPath: () => [host] }), false)
  } finally { if (previous) global.HTMLElement = previous; else delete global.HTMLElement }
})

test('calibração descarta movimento e clique exige permanência na mesma região', () => {
  let samples = []
  for (let i = 0; i < 20; i++) samples = face.stableFaceSamples(samples, { x: .5, y: .5 })
  samples = face.stableFaceSamples(samples, { x: .55, y: .5 })
  assert.equal(samples.length, 1)
  for (let i = 0; i < 34; i++) samples = face.stableFaceSamples(samples, { x: .55, y: .5 })
  assert.equal(samples.length, 35)
  assert.equal(face.faceDwellMoved({ x: 100, y: 100 }, { x: 105, y: 105 }), false)
  assert.equal(face.faceDwellMoved({ x: 100, y: 100 }, { x: 113, y: 100 }), true)
})

test('velocidade da mira usa tempo decorrido e limita saltos após travamento', () => {
  const bounds = { left: 0, top: 0, right: 1000, bottom: 1000 }
  const neutral = { x: .5, y: .5 }, point = { x: .6, y: .6 }, initial = { x: 100, y: 100 }
  const once = face.moveFaceCursor(initial, point, neutral, bounds, 100)
  const twice = face.moveFaceCursor(face.moveFaceCursor(initial, point, neutral, bounds, 50), point, neutral, bounds, 50)
  assert.ok(Math.abs(once.x - twice.x) < .00001)
  assert.ok(Math.abs(once.y - twice.y) < .00001)
  assert.deepEqual(face.moveFaceCursor(initial, point, neutral, bounds, 5000), once)
})
const originals = { storage: global.localStorage, navigator: Object.getOwnPropertyDescriptor(global, 'navigator'), window: global.window, document: global.document }
afterEach(() => {
  if (originals.storage === undefined) delete global.localStorage; else global.localStorage = originals.storage
  if (originals.navigator) Object.defineProperty(global, 'navigator', originals.navigator); else delete global.navigator
  if (originals.window === undefined) delete global.window; else global.window = originals.window
  if (originals.document === undefined) delete global.document; else global.document = originals.document
})

function hookEnvironment(filename, exportName, dependencies) {
  const slots = []
  let cursor = 0, effects = [], parameters = []
  const react = {
    useRef(value) { const index = cursor++; slots[index] ??= { current: value }; return slots[index] },
    useState(initial) { const index = cursor++; slots[index] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[index].value, update => { slots[index].value = typeof update === 'function' ? update(slots[index].value) : update }] },
    useCallback(callback, deps) { const index = cursor++, previous = slots[index]; if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) slots[index] = { value: callback, deps }; return slots[index].value },
    useEffect(effect, deps) { const index = cursor++, previous = slots[index]; if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() } }) },
  }
  const module = load(filename, name => name === 'react' ? react : dependencies[name])
  return {
    render(...args) { if (args.length) parameters = args; cursor = 0; effects = []; const result = module[exportName](...parameters); effects.forEach(effect => effect()); return result },
    unmount() { slots.forEach(slot => slot.cleanup?.()) },
  }
}

test('trocar posição ou dialog não recarrega nem desativa VLibras; desativar encerra a integração', async () => {
  const prefs = { libras: true, librasPosition: 'L' }, positions = []
  let dialog = null, enabled = 0, hidden = 0, appended = 0
  const update = () => {}
  const container = { matches: () => false, showPopover() {} }
  global.window = { addEventListener() {}, removeEventListener() {} }
  global.document = { body: { append() { appended++ } }, addEventListener() {}, removeEventListener() {} }
  const env = hookEnvironment('hooks/useLibras.ts', 'useLibras', {
    './useAccessibility': { useAccessibility: () => ({ preferences: prefs, update }) },
    './useTopDialog': { useTopDialog: () => dialog },
    '../services/libras': { enableLibras: async () => { enabled++; return container }, hideLibras: () => hidden++, positionLibras: position => positions.push(position) },
  })
  env.render()
  await new Promise(setImmediate)
  assert.equal(enabled, 1)
  prefs.librasPosition = 'R'
  env.render()
  dialog = { append() { appended++ } }
  env.render()
  await new Promise(setImmediate)
  assert.equal(enabled, 1)
  assert.equal(hidden, 0)
  assert.ok(positions.includes('R'))
  assert.ok(appended >= 2)
  prefs.libras = false
  env.render()
  assert.ok(hidden > 0)
  env.unmount()
})

test('parar a voz ignora resultados e erros tardios, permite nova tentativa e aborta ao desmontar', () => {
  const instances = [], results = []
  global.document = { addEventListener() {}, removeEventListener() {} }
  global.window = { SpeechRecognition: class { constructor() { instances.push(this); this.aborts = 0 } start() {} abort() { this.aborts++ } } }
  const env = hookEnvironment('hooks/useVoiceSearch.ts', 'useVoiceSearch', { '../services/voiceSearch': voice })
  env.render(text => results.push(text)).toggle()
  const first = instances[0], lateResult = first.onresult, lateError = first.onerror
  assert.equal(env.render().listening, true)
  env.render().stop()
  lateResult({ results: [[{ transcript: 'ignorar' }]] })
  assert.deepEqual(results, [])
  assert.equal(env.render().listening, false)
  env.render().toggle()
  lateError({ error: 'network' })
  assert.equal(env.render().listening, true)
  instances[1].onresult({ results: [[{ transcript: 'Marina' }]] })
  assert.deepEqual(results, ['Marina'])
  env.unmount()
  assert.equal(instances[1].aborts, 1)
  assert.equal(instances[1].onresult, null)
})

test('câmera calibra, pausa cliques, permite mirar em Retomar sem repetir e encerra por Escape', async () => {
  const keys = ['requestAnimationFrame', 'cancelAnimationFrame', 'innerWidth', 'innerHeight', 'performance']
  const saved = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(global, key)]))
  const frames = new Map(), listeners = new Map()
  let nextFrame = 0, clock = 0, clicks = 0, stopped = 0, closed = 0, candidate = null
  let detectedPoint = { x: .5, y: .5 }
  const video = { currentTime: 0, readyState: 2, setAttribute() {}, play: async () => {}, pause() {}, remove() {} }
  const stream = { getTracks: () => [{ stop() { stopped++ } }] }
  global.document = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener() {}, querySelectorAll: () => [], createElement: () => video }
  global.window = { innerWidth: 1000, innerHeight: 800, addEventListener() {}, removeEventListener() {}, scrollBy() {} }
  for (const [key, value] of Object.entries({ innerWidth: 1000, innerHeight: 800, performance: { now: () => clock += 100 }, requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame }, cancelAnimationFrame: id => frames.delete(id) })) Object.defineProperty(global, key, { configurable: true, value })
  const env = hookEnvironment('hooks/useFaceNavigation.ts', 'useFaceNavigation', {
    '../services/faceNavigation': { requestFaceCamera: async () => stream, createFaceLandmarker: async () => ({ detectForVideo: () => ({ faceLandmarks: detectedPoint ? [[{}, detectedPoint]] : [] }), close() { closed++ } }) },
    '../utils/faceNavigation': { ...face, faceInteractiveTarget: () => candidate },
    '../utils/accessibilityShortcuts': shortcuts,
  })
  const advance = async count => { for (let i = 0; i < count; i++) { video.currentTime++; const callbacks = [...frames.values()]; frames.clear(); await Promise.all(callbacks.map(fn => fn())) } }
  try {
    await env.render().start()
    assert.equal(env.render().status, 'calibrating')
    await advance(20)
    detectedPoint = null
    await advance(1)
    detectedPoint = { x: .5, y: .5 }
    await advance(15)
    assert.equal(env.render().status, 'calibrating')
    await advance(20)
    assert.equal(env.render().status, 'active')
    env.render().togglePause()
    assert.equal(env.render().status, 'paused')
    candidate = { classList: { add() {}, remove() {} }, hasAttribute: () => false, focus() {}, click() { clicks++ } }
    await advance(30)
    assert.equal(clicks, 0)
    candidate = { ...candidate, hasAttribute: () => true, click() { clicks++; env.render().togglePause() } }
    await advance(16)
    assert.equal(env.render().status, 'active')
    assert.equal(clicks, 1)
    await advance(20)
    assert.equal(clicks, 1)
    listeners.get('keydown')({ key: 'p', altKey: true, target: {}, preventDefault() {}, stopPropagation() {} })
    assert.equal(env.render().status, 'paused')
    listeners.get('keydown')({ key: 'Escape', preventDefault() {} })
    assert.equal(env.render().status, 'idle')
    assert.equal(stopped, 1)
    assert.equal(closed, 1)
  } finally {
    env.unmount()
    for (const key of keys) { if (saved[key]) Object.defineProperty(global, key, saved[key]); else delete global[key] }
  }
})

test('desativar VLibras encerra captura e remove cursor e marcações, inclusive ao repetir', () => {
  const libras = load('services/libras.ts')
  let closes = 0, pauses = 0
  global.window = { vlibras: { instance: { Module: { pauseMainLoop() { pauses++ } } } } }
  const app = { dataset: { active: 'true', expanded: 'true' }, shadowRoot: { querySelector: () => ({ click: () => closes++ }) } }
  const container = { hidden: false, matches: () => true, hidePopover() { this.closed = true } }
  const classes = new Set(['vlibras--hover', 'vlibras--active', 'astro-action'])
  let sdkSaved = JSON.stringify({ version: 1, state: { isOpen: true, opacity: .8 } })
  global.localStorage = { getItem: () => sdkSaved, setItem: (_key, value) => sdkSaved = value }
  global.document = {
    getElementById: id => id === 'astro-libras' ? container : id === 'vlibras-app-root' ? app : null,
    body: { dataset: { vlibrasExpanded: 'true' } },
    documentElement: { dataset: { vlibrasStatus: 'translating' } },
    querySelectorAll: () => [{ classList: { remove: (...names) => names.forEach(name => classes.delete(name)) } }],
  }
  libras.hideLibras()
  assert.equal(closes, 1)
  assert.equal(app.dataset.active, 'false')
  assert.equal(app.dataset.expanded, undefined)
  assert.equal(global.document.body.dataset.vlibrasExpanded, undefined)
  assert.equal(global.document.documentElement.dataset.vlibrasStatus, undefined)
  assert.deepEqual([...classes], ['astro-action'])
  assert.equal(container.hidden, true)
  assert.equal(container.closed, true)
  assert.deepEqual(JSON.parse(sdkSaved), { version: 1, _versao: 1, state: { isOpen: false, opacity: .8 } })
  assert.doesNotThrow(() => libras.hideLibras())
  assert.equal(pauses, 2)
})

test('preferências inválidas, versões desconhecidas e JSON quebrado voltam ao padrão Astro', () => {
  for (const raw of [null, '', '{', '[]', '{"_versao":9,"preferences":{"theme":"light"}}']) {
    assert.deepEqual(preferences.parseAccessibility(raw), preferences.DEFAULT_ACCESSIBILITY)
  }
  assert.equal(preferences.normalizeAccessibility({ theme: 'foreign', colorVision: '<script>', textSize: NaN, dyslexicFont: 'true' }).theme, 'dark')
  assert.equal(preferences.normalizeAccessibility({ textSize: Infinity }).textSize, 100)
  assert.equal(preferences.normalizeAccessibility({ textSize: 999 }).textSize, 150)
  assert.equal(preferences.normalizeAccessibility({ textSize: -100 }).textSize, 90)
  assert.equal(preferences.normalizeAccessibility({ theme: 'system' }).theme, 'dark')
  assert.equal(preferences.normalizeAccessibility({ theme: 'light' }).theme, 'dark')
  const migrated = preferences.parseAccessibility(JSON.stringify({ _versao: 1, preferences: { theme: 'light', highContrast: true, textSize: 125 } }))
  assert.equal(migrated.theme, 'dark')
  assert.equal(migrated.highContrast, true)
  assert.equal(migrated.textSize, 125)
})

test('salva e restaura só preferências conhecidas em schema versionado, sem câmera ou credenciais', () => {
  let stored
  global.localStorage = { setItem(key, value) { assert.equal(key, 'astro-accessibility'); stored = value }, getItem() { return stored } }
  preferences.saveAccessibility({ ...preferences.DEFAULT_ACCESSIBILITY, theme: 'light', colorVision: 'tritanopia', textSize: 125, camera: true, password: 'não salvar' })
  const parsed = JSON.parse(stored)
  assert.equal(parsed._versao, 1)
  assert.equal(parsed.preferences.camera, undefined)
  assert.equal(parsed.preferences.password, undefined)
  assert.equal(parsed.preferences.theme, 'dark')
  assert.equal(preferences.readAccessibility().textSize, 125)
  assert.equal(preferences.readAccessibility().colorVision, 'tritanopia')
  for (const option of preferences.COLOR_VISION_OPTIONS) assert.equal(preferences.normalizeAccessibility({ colorVision: option.value }).colorVision, option.value)
})

test('armazenamento bloqueado não impede usar ou restaurar as preferências', () => {
  global.localStorage = { getItem() { throw new Error('bloqueado') }, setItem() { throw new Error('bloqueado') } }
  assert.deepEqual(preferences.readAccessibility(), preferences.DEFAULT_ACCESSIBILITY)
  assert.doesNotThrow(() => preferences.saveAccessibility(preferences.DEFAULT_ACCESSIBILITY))
})

test('mensagens de erro das sete paletas mantêm contraste mínimo nas superfícies Astro', () => {
  const css = fs.readFileSync(path.join(__dirname, '../styles/accessibility.css'), 'utf8')
  const palettes = [...css.matchAll(/html\[data-astro-vision='([^']+)'\] \{[^}]*--a11y-error:\s*(#[\da-f]+)/gi)]
  assert.equal(palettes.length, 7)
  const whiteMix = Number(css.match(/--astro-primary-error: color-mix\(in srgb, var\(--a11y-error\), #fff (\d+)%\)/)[1]) / 100
  const rgb = hex => { const h = hex.slice(1); return (h.length === 3 ? [...h].map(c => c + c).join('') : h).match(/../g).map(c => parseInt(c, 16)) }
  const luminance = color => color.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
  for (const [, name, hex] of palettes) {
    const darkText = rgb(hex).map(v => v * (1 - whiteMix) + 255 * whiteMix)
    for (const surface of ['#444252', '#332754']) assert.ok(contrast(darkText, rgb(surface)) >= 4.5, `${name} no tema escuro`)
  }
})

test('mira facial respeita zona neutra, limites do popup e tempo de permanência sem cliques repetidos', () => {
  const bounds = { left: 20, top: 30, right: 300, bottom: 200 }
  assert.deepEqual(face.moveFaceCursor({ x: 100, y: 100 }, { x: .501, y: .501 }, { x: .5, y: .5 }, bounds), { x: 100, y: 100 })
  assert.deepEqual(face.moveFaceCursor({ x: 299, y: 199 }, { x: 0, y: 1 }, { x: .5, y: .5 }, bounds), { x: 300, y: 200 })
  assert.deepEqual(face.moveFaceCursor({ x: 21, y: 31 }, { x: 1, y: 0 }, { x: .5, y: .5 }, bounds), { x: 20, y: 30 })
  assert.equal(face.faceDwellProgress(100, 800), .5)
  assert.equal(face.faceDwellProgress(100, 1500), 1)
  assert.equal(face.faceDwellProgress(Infinity, 99999), 0)
})

test('pesquisa por voz trata ausência de suporte e configura apenas português após ação explícita', () => {
  global.window = {}
  assert.equal(voice.supportsVoiceSearch(), false)
  assert.throws(() => voice.createVoiceRecognition(), /não está disponível/)
  let instances = 0
  global.window.webkitSpeechRecognition = class { constructor() { instances++ } }
  assert.equal(voice.supportsVoiceSearch(), true)
  assert.equal(instances, 0)
  const recognition = voice.createVoiceRecognition()
  assert.equal(instances, 1)
  assert.equal(recognition.lang, 'pt-BR')
  assert.equal(recognition.continuous, false)
  assert.equal(recognition.interimResults, false)
  assert.match(voice.voiceErrorMessage('not-allowed'), /microfone/)
  assert.match(voice.voiceErrorMessage('network'), /conexão/)
})

test('permissão de câmera que chega depois de cancelar fecha todas as trilhas e não fica capturando', async () => {
  let requests = 0
  let stopped = 0
  let resolve
  Object.defineProperty(global, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async options => {
    requests++
    assert.equal(options.audio, false)
    return new Promise(done => { resolve = done })
  } } } })
  assert.equal(requests, 0)
  const controller = new AbortController()
  const pending = camera.requestFaceCamera(controller.signal)
  controller.abort()
  resolve({ getTracks: () => [{ stop() { stopped++ } }, { stop() { stopped++ } }] })
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(stopped, 2)
})
const { JSDOM } = require('jsdom')

test('mira facial seleciona as opções visíveis de ícone e cor sem ativar controles bloqueados', () => {
  const dom = new JSDOM('<dialog open><fieldset><label><input type="radio" name="icon"><span>Calendário</span></label><label><input type="radio" name="icon"><span>Equipe</span></label></fieldset></dialog><button>Fora</button>')
  global.document = dom.window.document
  const dialog = document.querySelector('dialog'), labels = [...document.querySelectorAll('label')]
  let hit = labels[1].querySelector('span')
  document.elementFromPoint = () => hit
  assert.equal(face.faceInteractiveTarget(10, 10, dialog), labels[1])
  face.faceInteractiveTarget(10, 10, dialog).click()
  assert.equal(labels[1].control.checked, true)
  dialog.querySelector('fieldset').disabled = true
  assert.equal(face.faceInteractiveTarget(10, 10, dialog), null)
  dialog.querySelector('fieldset').disabled = false
  labels[1].setAttribute('inert', '')
  assert.equal(face.faceInteractiveTarget(10, 10, dialog), null)
  hit = document.querySelector('button')
  assert.equal(face.faceInteractiveTarget(10, 10, dialog), null)
  assert.equal(face.faceInteractiveTarget(10, 10, null), hit)
  dom.window.close()
})

test('reduzir movimento da conta e do sistema remove a animação de exclusão', () => {
  const dom = new JSDOM('<div id="row"></div>')
  global.document = dom.window.document
  global.window = dom.window
  let osReduced = false, animated = 0, finished = 0
  window.matchMedia = () => ({ matches: osReduced })
  const row = document.querySelector('#row')
  row.animate = () => { animated++; return {} }
  const { animateRemoval } = load('utils/animateRemoval.ts')
  document.documentElement.dataset.astroReducedMotion = 'true'
  animateRemoval(row, () => finished++)
  assert.equal(animated, 0); assert.equal(finished, 1)
  document.documentElement.dataset.astroReducedMotion = 'false'
  osReduced = true
  animateRemoval(row, () => finished++)
  assert.equal(animated, 0); assert.equal(finished, 2)
  osReduced = false
  animateRemoval(row, () => finished++)
  assert.equal(animated, 1); assert.equal(finished, 2)
  dom.window.close()
})

test('reduzir movimento na conta elimina a espera de saída ao trocar resultados', () => {
  global.document = { documentElement: { dataset: { astroReducedMotion: 'true' } } }
  const delays = []
  global.window = { matchMedia: () => ({ matches: false }), setTimeout: (_callback, delay) => { delays.push(delay); return 1 }, clearTimeout() {} }
  const env = hookEnvironment('hooks/useAnimatedResults.ts', 'useAnimatedResults', {})
  env.render(['Antes'], 'antes')
  env.render(['Depois'], 'depois')
  assert.deepEqual(delays, [0])
  document.documentElement.dataset.astroReducedMotion = 'false'
  env.render(['Outro'], 'outro')
  assert.deepEqual(delays, [0, 180])
  env.unmount()
})

test('mira facial rola o conteúdo interno do editor mesmo com rodapé fixo', () => {
  const dom = new JSDOM('<dialog open><section style="overflow-y:auto"><button>Campo</button></section><footer><button>Salvar</button></footer></dialog>')
  global.document = dom.window.document; global.window = dom.window
  const dialog = document.querySelector('dialog'), section = document.querySelector('section')
  Object.defineProperties(section, { clientHeight: { value: 200 }, scrollHeight: { value: 600 } })
  section.getBoundingClientRect = () => ({ left: 20, right: 400, top: 100, bottom: 300, width: 380, height: 200 })
  document.elementFromPoint = () => document.querySelector('footer button')
  assert.equal(face.faceScrollTarget(100, 360, 1, dialog), section)
  section.scrollTop = 400
  assert.equal(face.faceScrollTarget(100, 360, 1, dialog), dialog)
  assert.equal(face.faceScrollTarget(100, 360, -1, dialog), section)
  assert.equal(face.faceScrollTarget(500, 360, -1, dialog), dialog)
  dom.window.close()
})
