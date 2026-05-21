import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PackageEntitlementDetailPage from './PackageEntitlementDetail'
import type { PackageEntitlementDetail } from '@/types/entitlement'
import {
  clearPracticeStartIdempotencyKey,
  getPracticeStartIdempotencyKey,
  usePackageEntitlementDetail,
  useStartPracticeSkill,
} from '@/api/entitlements'

const navigate = vi.fn()
const entitlementId = '35b2170d-d47d-42a4-a4b8-1228f7612563'
const orderId = '019e3166-3405-792f-9bd8-d594ad898854'

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
  usePackageEntitlementDetail: vi.fn(),
  useStartPracticeSkill: vi.fn(),
}))

function detail(overrides: Partial<PackageEntitlementDetail> = {}): PackageEntitlementDetail {
  return {
    id: entitlementId,
    order_id: orderId,
    product_id: '05139b57-b57d-42e9-8e61-3ca193b4306d',
    product_name: 'Gói thi  6 tháng',
    starts_at: '2026-05-16T15:27:23.542971Z',
    expires_at: '2026-11-16T15:27:23.542971Z',
    lrw_enabled: true,
    lrw_remaining: null,
    speaking_enabled: true,
    speaking_remaining: null,
    skills: [],
    ...overrides,
  }
}

function renderDetail(row: PackageEntitlementDetail, mutateAsync = vi.fn()) {
  vi.mocked(usePackageEntitlementDetail).mockReturnValue({
    data: row,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePackageEntitlementDetail>)
  vi.mocked(useStartPracticeSkill).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useStartPracticeSkill>)

  render(
    <MemoryRouter initialEntries={[`/app/packages/${entitlementId}`]}>
      <Routes>
        <Route path="/app/packages/:entitlementId" element={<PackageEntitlementDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PackageEntitlementDetail', () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(clearPracticeStartIdempotencyKey).mockReset()
    vi.mocked(getPracticeStartIdempotencyKey).mockReset()
    vi.mocked(usePackageEntitlementDetail).mockReset()
    vi.mocked(useStartPracticeSkill).mockReset()
  })

  it('renders separate start actions for every package practice skill', () => {
    renderDetail(detail())

    expect(screen.getByRole('button', { name: /start listening/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start reading/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start writing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start speaking/i })).toBeInTheDocument()
  })

  it('resumes and links results by practice_attempt_id', async () => {
    const listeningAttemptId = '8c617aa2-ce3d-490e-bb93-cb07ff70dc43'
    const writingAttemptId = '2a45cb3b-5f26-4459-8ba1-c4e4426f739b'
    renderDetail(
      detail({
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
    )

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
    renderDetail(detail(), mutateAsync)

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
})
