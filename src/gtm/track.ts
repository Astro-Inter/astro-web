export const EVENT_NAMES = ['screen_view', 'button_click', 'dialog_viewed', 'dialog_clicked', 'showcase_viewed', 'showcase_clicked'] as const
export type EventName = typeof EVENT_NAMES[number]
export interface TrackingScreen { nome_tela: string; contexto_tela: string }
export interface EventFields extends TrackingScreen {
  firebase_uid?: string | null
  nome_botao?: string | null
  nome_dialog?: string | null
  dialog_clicado?: string | null
  nome_showcase?: string | null
  showcase_click?: string | null
}
export interface TrackingPayload extends EventFields {
  tipo_evento: EventName
  firebase_uid: string | null
  nome_botao: string | null
  nome_dialog: string | null
  dialog_clicado: string | null
  nome_showcase: string | null
  showcase_click: string | null
}
export interface TrackingBrowser {
  dataLayer?: Array<Record<string, unknown>>
}

const fieldsByEvent: Record<EventName, readonly (keyof Pick<EventFields, 'nome_botao' | 'nome_dialog' | 'dialog_clicado' | 'nome_showcase' | 'showcase_click'>)[]> = {
  screen_view: [], button_click: ['nome_botao'], dialog_viewed: ['nome_dialog'],
  dialog_clicked: ['nome_dialog', 'dialog_clicado'], showcase_viewed: ['nome_showcase'],
  showcase_clicked: ['nome_showcase', 'showcase_click'],
}

/** Só inclui os campos aceitos pelo schema da API. Nunca copia objetos do formulário. */
export function buildPayload(event: EventName, fields: EventFields): TrackingPayload {
  if (!EVENT_NAMES.includes(event)) throw new Error('Evento de tracking desconhecido')
  const payload: TrackingPayload = {
    tipo_evento: event, firebase_uid: fields.firebase_uid ?? null,
    nome_tela: fields.nome_tela, contexto_tela: fields.contexto_tela,
    nome_botao: null, nome_dialog: null, dialog_clicado: null, nome_showcase: null, showcase_click: null,
  }
  for (const key of fieldsByEvent[event]) {
    const value = fields[key]
    if (typeof value !== 'string' || !value.trim() || value.length > 255 || value.includes('\0')) throw new Error(`Campo de tracking inválido: ${key}`)
    Object.assign(payload, { [key]: value })
  }
  for (const value of [payload.nome_tela, payload.firebase_uid]) {
    if (value !== null && (!value.trim() || value.length > 255 || value.includes('\0'))) throw new Error('Nome de tracking inválido')
  }
  if (payload.contexto_tela.length > 8000 || payload.contexto_tela.includes('\0')) throw new Error('Contexto de tracking inválido')
  return payload
}

/** O frontend só entrega ao GTM. A tag publicada faz o POST e a API grava no banco. */
export function pushTracking(browser: TrackingBrowser, event: EventName, fields: EventFields): void {
  const payload = buildPayload(event, fields)
  browser.dataLayer ??= []
  browser.dataLayer.push({ event, astro_event: payload })
}

export function initGTM(document: Document, browser: TrackingBrowser, id: string): void {
  if (!/^GTM-[A-Z0-9]+$/.test(id)) throw new Error('VITE_GTM_ID inválido')
  if (document.getElementById('astro-gtm')) return
  browser.dataLayer ??= []
  browser.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.id = 'astro-gtm'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`
  script.addEventListener('error', () => console.warn('Não foi possível carregar o GTM. Confira a conexão e os bloqueadores do navegador.'))
  document.head.appendChild(script)
}
