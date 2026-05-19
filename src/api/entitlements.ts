import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { unwrapApiData } from '@/lib/api-envelope'
import { clientUUID } from '@/lib/uuid'
import type {
  PackageEntitlement,
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
      return unwrapApiData<PackageEntitlement[]>(response.data)
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
      queryClient.invalidateQueries({ queryKey: ['practice-history'] })
    },
  })
}

export const usePracticeHistory = (skill?: PracticeSkill) => {
  return useQuery({
    queryKey: ['practice-history', skill ?? 'all'],
    queryFn: async () => {
      const params = skill ? `?skill=${skill}` : ''
      const response = await api.get(`/api/v1/practice/history${params}`)
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

export type { PracticeSkill, StartEntitlementAttemptResponse, SkillAttemptInfo, PracticeHistoryItem }

export const useResumeOrderPayment = () => {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post(`/api/v1/package-entitlements/${orderId}/resume-payment`)
      return unwrapApiData<ResumePaymentPayload>(response.data)
    },
  })
}
