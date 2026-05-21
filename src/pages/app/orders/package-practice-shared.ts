import { BookOpen, Headphones, Mic, PenLine } from 'lucide-react'
import type { PackageEntitlementDetail, PracticeSkill } from '@/types/entitlement'

export function quotaLabel(remaining?: number | null) {
  if (remaining == null) return 'Unlimited'
  return `${remaining} left`
}

export const LRW_SKILLS: Array<{
  skill: PracticeSkill
  label: string
  icon: typeof Headphones
}> = [
  { skill: 'listening', label: 'Listening', icon: Headphones },
  { skill: 'reading', label: 'Reading', icon: BookOpen },
  { skill: 'writing', label: 'Writing', icon: PenLine },
]

export const SPEAKING_SKILL = { skill: 'speaking' as PracticeSkill, label: 'Speaking', icon: Mic }

export const PART_OPTIONS_BY_SKILL: Partial<Record<PracticeSkill, number[]>> = {
  listening: [1, 2, 3, 4],
  reading: [1, 2, 3, 4],
  writing: [1, 2],
}

export function findSkillAttempt(entitlement: PackageEntitlementDetail, skill: PracticeSkill) {
  return entitlement.skills.find((attempt) => attempt.skill === skill)
}
