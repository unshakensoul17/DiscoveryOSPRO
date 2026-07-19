// Workspace
export interface Workspace {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
  member_count: number
  role: 'admin' | 'editor' | 'viewer'
  config: WorkspaceConfig
}

export interface WorkspaceConfig {
  evidence_weights: Record<string, number>
  stale_threshold_days: number
  confidence_decay_rate: number
  time_horizons?: {
    short_term: number
    medium_term: number
    long_term: number
  }
}

// Claims
export type ClaimType = 'strategic_belief' | 'metric' | 'assumption' | 'operational_fact'

export interface Claim {
  id: string
  workspace_id: string
  content: string
  type: ClaimType
  status: 'active' | 'archived'
  confidence: number
  staleness_score: number
  drift_indicator: number
  extracted_by?: string
  extracted_at?: string
  created_at: string
  updated_at: string
  user_reviewed: boolean
  evidence_count: {
    supporting: number
    contradicting: number
  }
}

export interface ClaimDetail extends Claim {
  evidence: Evidence[]
  knowledge_state: KnowledgeState
  related_claims: Claim[]
  contradictions: Contradiction[]
}

export interface Contradiction {
  id: string
  workspace_id: string
  claim_id: string
  conflicting_claim_id: string
  severity: number
  status: 'active' | 'dismissed' | 'resolved'
  detected_at: string
}

// Evidence
export type EvidenceType = 'survey_result' | 'metric' | 'interview' | 'report' | 'analysis' | 'data_gap'
export type EvidencePolarity = 'supporting' | 'contradicting' | 'neutral'

export interface Evidence {
  id: string
  claim_id: string
  content: string
  type: EvidenceType
  polarity: EvidencePolarity
  reliability_score: number
  weight: number
  days_old: number
  source_document: string
  source_chunk: string
  extracted_at: string
  user_verified: boolean
}

// Knowledge State
export interface KnowledgeState {
  claim_id: string
  belief_confidence: number
  staleness_score: number
  drift_indicator: number
  last_updated: string
  last_updated_by: string
  times_updated: number
  days_since_last_update: number
  oldest_evidence_date: string
  newest_evidence_date: string
  history: KnowledgeStateHistoryEntry[]
}

export interface KnowledgeStateHistoryEntry {
  event: string
  timestamp: string
  confidence_before: number
  confidence_after: number
  change: number
  reason: string
}

// Discoveries
export type DiscoveryType = 'belief_drift' | 'contradiction' | 'stale_evidence' | 'assumption_exposure' | 'unknown_unknown' | 'research_bias'

export interface Discovery {
  id: string
  workspace_id: string
  type: DiscoveryType
  severity: number
  description: string
  affected_claim_id?: string
  affected_claims?: string[]
  status: 'active' | 'dismissed' | 'resolved'
  detected_at: string
  dismissed_at?: string
  metadata: Record<string, any>
}

// Research
export interface ResearchRecommendation {
  id: string
  title: string
  description: string
  discovery_id?: string
  priority: number
  impact_score: number
  estimated_effort: 'low' | 'medium' | 'high'
  estimated_time_hours: number
  status: 'pending' | 'in_progress' | 'completed'
  assigned_to?: string
  research_type: string
  suggested_approach: string
  expected_evidence: string
  created_at: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  pagination?: {
    limit: number
    offset: number
    total: number
    has_more: boolean
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
    timestamp: string
    trace_id: string
  }
}

// User
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

// Goals
export interface Goal {
  id: string
  workspace_id: string
  title: string
  description?: string
  status: 'active' | 'achieved' | 'failed'
  target_date?: string
  created_at: string
  updated_at: string
}

// Claim history
export interface ClaimHistoryEntry {
  id: string
  event_type: string
  timestamp: string
  confidence_before: number
  confidence_after: number
  trigger?: Record<string, any>
  reason?: string
  updated_by?: string
}