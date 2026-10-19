import FaceWorker from '../workers/faceNavigation?worker'
import type { FaceDetector, FaceDetectionResult, FaceWorkerResponse } from '../types/faceNavigation'

export function startFaceWorker(signal: AbortSignal): Promise<FaceDetector> {
  signal.throwIfAborted()
  if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return Promise.reject(new Error('Este navegador não oferece análise facial em segundo plano. Use uma versão atual do Chrome ou Edge.'))
  }
  return new Promise((resolve, reject) => {
    const worker = new FaceWorker()
    let closed = false
    let pending: { resolve: (result: FaceDetectionResult) => void; reject: (error: Error) => void } | null = null
    let capturing = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const close = () => {
      if (closed) return
      closed = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      worker.terminate()
      pending?.reject(new DOMException('Análise cancelada.', 'AbortError'))
      pending = null
    }
    const abort = () => { close(); reject(new DOMException('Análise cancelada.', 'AbortError')) }
    const fail = (message: string, cause?: string) => { const error = new Error(message, { cause }); pending?.reject(error); pending = null; close(); reject(error) }
    signal.addEventListener('abort', abort, { once: true })
    timer = setTimeout(() => fail('A análise facial demorou para iniciar. Confira a conexão e tente novamente.'), 60_000)
    worker.onerror = event => fail('Não foi possível executar a análise facial em segundo plano.', event.message)
    worker.onmessage = ({ data }: MessageEvent<FaceWorkerResponse>) => {
      if (closed) return
      clearTimeout(timer)
      if (data.type === 'error') { fail('A análise facial foi interrompida. Tente ativar novamente.', data.message); return }
      if (data.type === 'result') { const request = pending; pending = null; request?.resolve(data.result); return }
      resolve({
        close,
        async detectForVideo(video, timestamp) {
          if (closed) throw new DOMException('Análise cancelada.', 'AbortError')
          if (pending || capturing) throw new Error('Já existe uma imagem em análise.')
          capturing = true
          let bitmap: ImageBitmap
          try { bitmap = await createImageBitmap(video, { resizeWidth: 320, resizeHeight: 240 }) }
          finally { capturing = false }
          if (closed) { bitmap.close(); throw new DOMException('Análise cancelada.', 'AbortError') }
          return new Promise<FaceDetectionResult>((done, failed) => {
            pending = { resolve: done, reject: failed }
            timer = setTimeout(() => fail('A análise facial parou de responder. Ative a câmera novamente.'), 10_000)
            try { worker.postMessage({ type: 'frame', bitmap, timestamp }, [bitmap]) }
            catch (error: unknown) { bitmap.close(); fail(error instanceof Error ? error.message : 'Falha ao enviar a imagem para análise.') }
          })
        },
      })
    }
    try { worker.postMessage({ type: 'init' }) }
    catch { fail('Não foi possível iniciar a análise facial em segundo plano.') }
  })
}
