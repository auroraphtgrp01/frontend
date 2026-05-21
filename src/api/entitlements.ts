import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { unwrapApiData } from '@/lib/api-envelope'
import { clientUUID } from '@/lib/uuid'
import type {
  PackageEntitlementDetail,
  PackageEntitlementSummary,
  PracticeSkill,
  PracticeHistoryItem,
  StartEntitlementAttemptResponse,
  SkillAttemptInfo,
} from '@/types/entitlement'

type ResumePaymentPayload = {
  vnp_url: string
}

const PRACTICE_START_KEY_PREFIX = 'imto.practice.start'

function createPracticeStartIdempotencyKey(orderId: string, skill: PracticeSkill) {
  return `practice-start:${orderId}:${skill}:${clientUUID()}`
}

function practiceStartStorageKey(orderId: string, skill: PracticeSkill) {
  return `${PRACTICE_START_KEY_PREFIX}:${orderId}:${skill}`
}

export function getPracticeStartIdempotencyKey(orderId: string, skill: PracticeSkill) {
  const storageKey = practiceStartStorageKey(orderId, skill)
  const existing = sessionStorage.getItem(storageKey)
  if (existing) return existing

  const next = createPracticeStartIdempotencyKey(orderId, skill)
  sessionStorage.setItem(storageKey, next)
  return next
}

export function clearPracticeStartIdempotencyKey(orderId: string, skill: PracticeSkill) {
  sessionStorage.removeItem(practiceStartStorageKey(orderId, skill))
}

export const usePackageEntitlements = () => {
  return useQuery({
    queryKey: ['practice-entitlements'],
    queryFn: async () => {
      const response = await api.get('/api/v1/practice/entitlements')
      return unwrapApiData<PackageEntitlementSummary[]>(response.data)
    },
  })
}

export const usePackageEntitlementDetail = (entitlementId: string | undefined) => {
  return useQuery({
    queryKey: ['practice-entitlement', entitlementId],
    enabled: Boolean(entitlementId),
    queryFn: async () => {
      const response = await api.get(`/api/v1/practice/entitlements/${entitlementId}`)
      return unwrapApiData<PackageEntitlementDetail>(response.data)
    },
  })
}

export const useStartPracticeSkill = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      skill,
      idempotencyKey,
      examUuid,
    }: {
      orderId: string
      skill: PracticeSkill
      idempotencyKey: string
      examUuid?: string
    }) => {
      const body: Record<string, string> = { idempotency_key: idempotencyKey }
      if (examUuid) body.exam_uuid = examUuid
      const response = await api.post(
        `/api/v1/practice/entitlements/${orderId}/start/${skill}`,
        body,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      return unwrapApiData<StartEntitlementAttemptResponse>(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-entitlements'] })
      queryClient.invalidateQueries({ queryKey: ['practice-entitlement'] })
      queryClient.invalidateQueries({ queryKey: ['practice-history'] })
    },
  })
}

export const usePracticeHistory = (skill?: PracticeSkill) => {
  return usePracticeHistoryFiltered({ skill })
}

type PracticeHistoryFilters = {
  skill?: PracticeSkill
  status?: 'in_progress' | 'submitted' | 'graded' | 'all'
  search?: string
}

export const usePracticeHistoryFiltered = (filters: PracticeHistoryFilters = {}) => {
  const normalizedStatus = filters.status && filters.status !== 'all' ? filters.status : undefined
  const normalizedSearch = filters.search?.trim() ? filters.search.trim() : undefined

  return useQuery({
    queryKey: ['practice-history', filters.skill ?? 'all', normalizedStatus ?? 'all', normalizedSearch ?? ''],
    queryFn: async () => {
      const query = new URLSearchParams()
      if (filters.skill) query.set('skill', filters.skill)
      if (normalizedStatus) query.set('status', normalizedStatus)
      if (normalizedSearch) query.set('search', normalizedSearch)
      const suffix = query.size > 0 ? `?${query.toString()}` : ''
      const response = await api.get(`/api/v1/practice/history${suffix}`)
      const payload = response.data as { data?: PracticeHistoryItem[] }
      if (Array.isArray(payload?.data)) {
        return payload.data
      }
      return unwrapApiData<PracticeHistoryItem[]>(response.data)
    },
    staleTime: 30_000,
  })
}

export const useStartPackageLRW = () => {
  const startSkill = useStartPracticeSkill()

  return {
    ...startSkill,
    mutateAsync: (orderId: string) =>
      startSkill.mutateAsync({
        orderId,
        skill: 'listening',
        idempotencyKey: getPracticeStartIdempotencyKey(orderId, 'listening'),
      }),
  }
}

export const useStartPackageSpeaking = () => {
  const startSkill = useStartPracticeSkill()

  return {
    ...startSkill,
    mutateAsync: (orderId: string) =>
      startSkill.mutateAsync({
        orderId,
        skill: 'speaking',
        idempotencyKey: getPracticeStartIdempotencyKey(orderId, 'speaking'),
      }),
  }
}

export const useStartSkill = () => {
  return useStartPracticeSkill()
}

export type {
  PackageEntitlementDetail,
  PackageEntitlementSummary,
  PracticeSkill,
  StartEntitlementAttemptResponse,
  SkillAttemptInfo,
  PracticeHistoryItem,
}

export const useResumeOrderPayment = () => {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post(`/api/v1/package-entitlements/${orderId}/resume-payment`)
      return unwrapApiData<ResumePaymentPayload>(response.data)
    },
  })
}
