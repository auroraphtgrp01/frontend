export interface SkillAttemptInfo {
  practice_skill_attempt_id: string
  skill: PracticeSkill
  exam_uuid: string
  status: string
  practice_attempt_id?: string
  can_view_result?: boolean
}

export type PracticeSkill = 'listening' | 'reading' | 'writing' | 'speaking'

/** GET /api/v1/practice/entitlements */
export interface PackageEntitlementSummary {
  id: string
  order_id: string
  product_id: string
  product_name?: string
  starts_at: string
  expires_at: string
  lrw_enabled: boolean
  lrw_remaining?: number | null
  speaking_enabled: boolean
  speaking_remaining?: number | null
}

/** GET /api/v1/practice/entitlements/:id */
export interface PackageEntitlementDetail extends PackageEntitlementSummary {
  skills: SkillAttemptInfo[]
}

export interface StartEntitlementAttemptResponse {
  order_id: string
  skill: PracticeSkill
  practice_attempt_id: string
  practice_skill_attempt_id: string
  exam_uuid?: string
  skills?: SkillAttemptInfo[]
}

export interface PracticeHistoryItem {
  practice_attempt_id: string
  practice_skill_attempt_id: string
  skill: PracticeSkill
  exam_uuid: string
  exam_title?: string
  exam_code?: string
  status: 'in_progress' | 'submitted' | 'graded'
  started_at: string
  submitted_at?: string
  can_view_result: boolean
}
