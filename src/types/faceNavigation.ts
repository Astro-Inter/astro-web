import type { FacePoint } from '../utils/faceNavigation'

export interface FaceDetectionResult { faceLandmarks: FacePoint[][] }
export interface FaceDetector {
  detectForVideo(video: HTMLVideoElement, timestamp: number): Promise<FaceDetectionResult>
  close(): void
}
export type FaceWorkerRequest = { type: 'init' } | { type: 'frame'; bitmap: ImageBitmap; timestamp: number }
export type FaceWorkerResponse = { type: 'ready' } | { type: 'result'; result: FaceDetectionResult } | { type: 'error'; message: string }
