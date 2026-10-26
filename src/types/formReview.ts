import type { FormDetailsResponse } from './forms'

export type FormReviewStatus = 'awaiting_response' | 'awaiting_review' | 'approved' | 'rejected'
export interface FormReviewMetadata { reviewerName: string; reviewedAt: string }
export type FormReviewDecision =
  | ({ status: 'approved' } & FormReviewMetadata)
  | ({ status: 'rejected'; description: string } & FormReviewMetadata)
export type FormReviewState = { status: 'awaiting_response' | 'awaiting_review' } | FormReviewDecision

export interface FormReviewData {
  form: FormDetailsResponse
  currentManagerId: number | null
  canReview?: boolean
  recipientName: string
  senderName: string
  unitName: string
  review: FormReviewState
}
export interface FormResponseFile { id: string; name: string; url: string | null }

export interface FormImageDownload { id: string; url: string; expiresAt: string }
