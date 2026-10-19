import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { FaceWorkerRequest, FaceWorkerResponse } from '../types/faceNavigation'

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<FaceWorkerRequest>) => void) | null
  postMessage: (message: FaceWorkerResponse) => void
}
let detector: FaceLandmarker | null = null

scope.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm', true)
      detector = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'CPU' },
        runningMode: 'VIDEO', numFaces: 1, minFaceDetectionConfidence: .55, minFacePresenceConfidence: .55, minTrackingConfidence: .55,
      })
      scope.postMessage({ type: 'ready' })
    } else {
      try {
        if (!detector) throw new Error('Detector indisponível.')
        const nose = detector.detectForVideo(data.bitmap, data.timestamp).faceLandmarks[0]?.[1]
        scope.postMessage({ type: 'result', result: { faceLandmarks: nose ? [[{ x: 0, y: 0 }, { x: nose.x, y: nose.y }]] : [] } })
      } finally { data.bitmap.close() }
    }
  } catch (error: unknown) {
    scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Falha na análise facial.' })
  }
}
