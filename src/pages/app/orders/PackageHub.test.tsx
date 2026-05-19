import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PackageHub from './PackageHub'
import type { PackageEntitlement, PracticeHistoryItem } from '@/types/entitlement'
import {
  clearPracticeStartIdempotencyKey,
  getPracticeStartIdempotencyKey,
  usePackageEntitlements,
  usePracticeHistory,
  useStartPracticeSkill,
} from '@/api/entitlements'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/api/entitlements', () => ({
  clearPracticeStartIdempotencyKey: vi.fn(),
  getPracticeStartIdempotencyKey: vi.fn(),
  usePackageEntitlements: vi.fn(),
  usePracticeHistory: vi.fn(),
  useStartPracticeSkill: vi.fn(),
}))

const orderId = '4fd698ce-4e88-40bf-8dd0-ccdf4ce12260'

function entitlement(overrides: Partial<PackageEntitlement> = {}): PackageEntitlement {
  return {
    order_id: orderId,
    product_id: 'b592f9ed-f34d-4d4d-9d35-6cb7a0fcdd51',
    expires_at: '2026-07-01T00:00:00Z',
    lrw_enabled: true,
    lrw_remaining: null,
    speaking_enabled: true,
    speaking_remaining: null,
    skills: [],
    ...overrides,
  }
}

function renderHub(
  rows: PackageEntitlement[],
  mutateAsync = vi.fn(),
  history: PracticeHistoryItem[] = [],
) {
  vi.mocked(usePackageEntitlements).mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePackageEntitlements>)
  vi.mocked(usePracticeHistory).mockReturnValue({
    data: history,
    isLoading: false,
  } as unknown as ReturnType<typeof usePracticeHistory>)
  vi.mocked(useStartPracticeSkill).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useStartPracticeSkill>)

  render(
    <MemoryRouter>
      <PackageHub />
    </MemoryRouter>,
  )
}

describe('PackageHub practice actions', () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(clearPracticeStartIdempotencyKey).mockReset()
    vi.mocked(getPracticeStartIdempotencyKey).mockReset()
    vi.mocked(usePackageEntitlements).mockReset()
    vi.mocked(usePracticeHistory).mockReset()
    vi.mocked(useStartPracticeSkill).mockReset()
  })

  it('renders separate start actions for every package practice skill', () => {
    renderHub([entitlement()])

    expect(screen.getByRole('button', { name: /start listening/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start reading/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start writing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start speaking/i })).toBeInTheDocument()
  })

  it('resumes and links results by practice_attempt_id', async () => {
    const listeningAttemptId = '8c617aa2-ce3d-490e-bb93-cb07ff70dc43'
    const writingAttemptId = '2a45cb3b-5f26-4459-8ba1-c4e4426f739b'
    renderHub([
      entitlement({
        skills: [
          {
            skill: 'listening',
            practice_attempt_id: listeningAttemptId,
            practice_skill_attempt_id: '6df6d99e-bf92-4f08-81f9-50c6147f5c60',
            exam_uuid: '6575e35e-284d-4b2f-a3f8-af726d9aecda',
            status: 'in_progress',
          },
          {
            skill: 'writing',
            practice_attempt_id: writingAttemptId,
            practice_skill_attempt_id: 'f258c88e-98c2-4bec-a4e3-91b7bd99fa46',
            exam_uuid: 'fc0a8691-3c6c-419d-8028-c59386c87be1',
            status: 'graded',
            can_view_result: true,
          },
        ],
      }),
    ])

    await userEvent.click(screen.getByRole('button', { name: /resume listening/i }))

    expect(navigate).toHaveBeenCalledWith(`/app/practice/session/${listeningAttemptId}`)
    expect(screen.getByRole('link', { name: /view result/i })).toHaveAttribute(
      'href',
      `/app/practice/results/${writingAttemptId}`,
    )
  })

  it('starts a UUID order skill with idempotency key and navigates to practice_attempt_id', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({
      practice_attempt_id: '2a45cb3b-5f26-4459-8ba1-c4e4426f739b',
      practice_skill_attempt_id: 'f258c88e-98c2-4bec-a4e3-91b7bd99fa46',
      skill: 'reading',
    })
    vi.mocked(getPracticeStartIdempotencyKey).mockReturnValue('practice-start-key')
    renderHub([entitlement()], mutateAsync)

    await user.click(screen.getByRole('button', { name: /start reading/i }))

    expect(mutateAsync).toHaveBeenCalledWith({
      orderId,
      skill: 'reading',
      idempotencyKey: 'practice-start-key',
      examUuid: undefined,
    })
    expect(clearPracticeStartIdempotencyKey).toHaveBeenCalledWith(orderId, 'reading')
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        '/app/practice/session/2a45cb3b-5f26-4459-8ba1-c4e4426f739b',
      )
    })
  })

  it('renders history rows with continue, result, and redo actions', async () => {
    const user = userEvent.setup()
    const redoAttemptId = 'fb715a92-f1d3-4563-9d0f-c400c53774b2'
    const historyExamUuid = '6575e35e-284d-4b2f-a3f8-af726d9aecda'
    const mutateAsync = vi.fn().mockResolvedValue({
      practice_attempt_id: redoAttemptId,
      practice_skill_attempt_id: 'fa38d0f7-68eb-49a4-a7df-04e599b7bc7c',
      skill: 'listening',
    })
    renderHub(
      [entitlement()],
      mutateAsync,
      [
        {
          practice_attempt_id: '8c617aa2-ce3d-490e-bb93-cb07ff70dc43',
          practice_skill_attempt_id: '6df6d99e-bf92-4f08-81f9-50c6147f5c60',
          skill: 'listening',
          exam_uuid: historyExamUuid,
          exam_title: 'Mock Listening — Gói thử',
          exam_code: '42',
          status: 'in_progress',
          started_at: '2026-05-17T01:00:00Z',
          can_view_result: false,
        },
        {
          practice_attempt_id: '2a45cb3b-5f26-4459-8ba1-c4e4426f739b',
          practice_skill_attempt_id: 'f258c88e-98c2-4bec-a4e3-91b7bd99fa46',
          skill: 'writing',
          exam_uuid: 'fc0a8691-3c6c-419d-8028-c59386c87be1',
          status: 'graded',
          started_at: '2026-05-17T02:00:00Z',
          submitted_at: '2026-05-17T03:00:00Z',
          can_view_result: true,
        },
      ],
    )

    await user.click(screen.getByRole('button', { name: /listening 1/i }))
    expect(screen.getByText(/Mock Listening — Gói thử · Đề #42/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(navigate).toHaveBeenCalledWith('/app/practice/session/8c617aa2-ce3d-490e-bb93-cb07ff70dc43')

    await user.click(screen.getByRole('button', { name: /redo/i }))
    expect(mutateAsync).toHaveBeenCalledWith({
      orderId,
      skill: 'listening',
      idempotencyKey: expect.stringContaining(`practice-redo:${orderId}:listening:${historyExamUuid}:`),
      examUuid: historyExamUuid,
    })
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(`/app/practice/session/${redoAttemptId}`)
    })

    await user.click(screen.getByRole('button', { name: /writing 1/i }))
    expect(screen.getByRole('link', { name: /view result/i })).toHaveAttribute(
      'href',
      '/app/practice/results/2a45cb3b-5f26-4459-8ba1-c4e4426f739b',
    )
  })

  it('renders an empty history state', () => {
    renderHub([entitlement()])

    expect(screen.getByText(/no past attempts yet/i)).toBeInTheDocument()
  })
})
