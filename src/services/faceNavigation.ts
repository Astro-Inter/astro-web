import type { FaceDetector } from '../types/faceNavigation'
import { startFaceWorker } from './faceNavigationWorkerClient'

export async function createFaceLandmarker(signal: AbortSignal): Promise<FaceDetector> {
  return startFaceWorker(signal)
}

export async function requestFaceCamera(signal: AbortSignal): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('A câmera não está disponível. Use HTTPS ou localhost e confira o suporte do navegador.')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 20 } } })
  if (signal.aborted) { stream.getTracks().forEach(track => track.stop()); signal.throwIfAborted() }
  return stream
}
