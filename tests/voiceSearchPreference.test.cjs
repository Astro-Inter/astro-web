const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')

function environment(auth) {
  const cache = new Map()
  function load(file) {
    file = path.resolve(file)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (!name.startsWith('.')) return require(name)
      const target = path.resolve(path.dirname(file), name)
      if (target === path.resolve('src/hooks/useAuthentication')) return { useAuthentication: () => auth }
      if (target === path.resolve('src/hooks/useAccessibilityRuntime')) return { useAccessibilityRuntime: () => ({ face: { status: 'idle', stop() {} }, libras: {} }) }
      return load([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(candidate => fs.existsSync(candidate)))
    }, module, module.exports)
    return module.exports
  }
  return { load }
}

test('microfone começa oculto, habilita nas acessibilidades e aborta ao desativar, trocar conta ou sair', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://astro.example.test' })
  const names = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Event', 'localStorage', 'requestAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']
  const saved = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  for (const name of names.slice(0, 6)) Object.defineProperty(global, name, { configurable: true, writable: true, value: dom.window[name] })
  Object.assign(global, { requestAnimationFrame: callback => { callback(); return 0 }, IS_REACT_ACT_ENVIRONMENT: true })
  dom.window.matchMedia = () => ({ matches: true })
  const recognizers = []
  dom.window.SpeechRecognition = class {
    constructor() { this.aborts = 0; recognizers.push(this) }
    start() {}
    abort() { this.aborts++ }
  }
  const auth = { status: 'ready', user: { uid: 'conta-a', accountType: 'GESTOR' } }
  const env = environment(auth)
  const Provider = env.load('src/providers/accessibility/index.tsx').default
  const Settings = env.load('src/components/accessibilitySettings/index.tsx').default
  const Search = env.load('src/components/toolbarSearch/index.tsx').default
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  const results = []
  const render = async () => React.act(async () => root.render(React.createElement(Provider, null,
    React.createElement(Settings), ...['Colaboradores', 'Dashboards'].map(label => React.createElement(Search, { key: label, label, value: '', onChange: event => results.push(event.target.value) })),
  )))
  const toggle = async () => React.act(async () => document.querySelector('input[aria-label="Pesquisa por voz"]').click())
  const microphones = () => document.querySelectorAll('.astro-toolbar-search-voice')
  try {
    await render()
    assert.equal(document.querySelector('input[aria-label="Pesquisa por voz"]').checked, false)
    assert.equal(microphones().length, 0); assert.equal(recognizers.length, 0)
    await toggle(); assert.equal(microphones().length, 2); assert.equal(recognizers.length, 0)
    assert.equal(JSON.parse(localStorage.getItem('astro-accessibility')).preferences.voiceSearch, true)
    await React.act(async () => microphones()[0].click())
    const lateResult = recognizers[0].onresult
    assert.equal(microphones()[0].getAttribute('aria-pressed'), 'true')
    await toggle()
    assert.equal(microphones().length, 0); assert.equal(recognizers[0].aborts, 1)
    await React.act(async () => lateResult({ results: [[{ transcript: 'ignorar' }]] }))
    assert.deepEqual(results, [])
    await toggle()
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Restaurar padrão').click())
    assert.equal(microphones().length, 0)
    await toggle()
    auth.user = { uid: 'conta-b', accountType: 'GESTOR_WORKSPACE' }
    await render(); assert.equal(microphones().length, 0)
    await toggle(); await React.act(async () => microphones()[0].click())
    auth.user = null; auth.status = 'anonymous'
    await render()
    assert.equal(microphones().length, 0); assert.equal(recognizers[1].aborts, 1)
    assert.equal(localStorage.getItem('astro-accessibility'), null)
    auth.user = { uid: 'conta-b', accountType: 'GESTOR_WORKSPACE' }; auth.status = 'ready'
    await render(); assert.equal(microphones().length, 0)
    const { normalizeAccessibility, parseAccessibility } = env.load('src/utils/accessibility.ts')
    assert.equal(normalizeAccessibility({ voiceSearch: 'true' }).voiceSearch, false)
    assert.equal(parseAccessibility(JSON.stringify({ _versao: 1, accountId: 'conta-b', preferences: { textSize: 110 } }), 'conta-b').voiceSearch, false)
  } finally {
    await React.act(async () => root.unmount()); dom.window.close()
    for (const name of names) { if (saved[name]) Object.defineProperty(global, name, saved[name]); else delete global[name] }
  }
})
