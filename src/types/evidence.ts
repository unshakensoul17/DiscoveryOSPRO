export type EvidenceType =
  | 'survey_result'
  | 'metric'
  | 'interview'
  | 'report'
  | 'analysis'
  | 'data_gap'

export type EvidencePolarity = 'supporting' | 'contradicting' | 'neutral'

export interface Evidence {
  id: string
  claim_id: string
  content: string
  type: EvidenceType
  polarity: EvidencePolarity
  reliability_score: number // 0-1
  weight: number // 0-1
  days_old: number
  source_document: string
  source_chunk: string
  extracted_at: string
  user_verified: boolean
  metadata?: Record<string, any>
}

export interface CreateEvidenceInput {
  content: string
  type: EvidenceType
  polarity: EvidencePolarity
  source_document: string
  source_chunk: string
  reliability_score?: number
}

export interface UpdateEvidenceInput {
  weight?: number
  reliability_score?: number
  user_verified?: boolean
}
