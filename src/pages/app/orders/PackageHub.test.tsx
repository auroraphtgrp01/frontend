import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PackageHub from './PackageHub'
import type { PackageEntitlementSummary } from '@/types/entitlement'
import { usePackageEntitlements } from '@/api/entitlements'

vi.mock('@/api/entitlements', () => ({
  usePackageEntitlements: vi.fn(),
}))

const entitlementId = '35b2170d-d47d-42a4-a4b8-1228f7612563'

function summary(overrides: Partial<PackageEntitlementSummary> = {}): PackageEntitlementSummary {
  return {
    id: entitlementId,
    order_id: '019e3166-3405-792f-9bd8-d594ad898854',
    product_id: '05139b57-b57d-42e9-8e61-3ca193b4306d',
    product_name: 'Gói thi  6 tháng',
    starts_at: '2026-05-16T15:27:23.542971Z',
    expires_at: '2026-11-16T15:27:23.542971Z',
    lrw_enabled: true,
    lrw_remaining: null,
    speaking_enabled: true,
    speaking_remaining: null,
    ...overrides,
  }
}

function renderHub(rows: PackageEntitlementSummary[]) {
  vi.mocked(usePackageEntitlements).mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePackageEntitlements>)

  render(
    <MemoryRouter>
      <PackageHub />
    </MemoryRouter>,
  )
}

describe('PackageHub list', () => {
  beforeEach(() => {
    vi.mocked(usePackageEntitlements).mockReset()
  })

  it('renders package summary cards linking to detail', () => {
    renderHub([summary()])

    const link = screen.getByRole('link', { name: /gói thi 6 tháng/i })
    expect(link).toHaveAttribute('href', `/app/packages/${entitlementId}`)
    expect(screen.getByText(/unlimited/i)).toBeInTheDocument()
  })

  it('renders an empty state', () => {
    renderHub([])
    expect(screen.getByText(/no active package entitlements yet/i)).toBeInTheDocument()
  })
})
