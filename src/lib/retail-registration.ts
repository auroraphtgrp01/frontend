import type {
  RetailRegistrationCatalog,
  RetailRegistrationProduct,
  WritingFeedbackMode,
} from '@/types/product'
import type { SlotAvailability } from '@/types/booking'

export const DEFAULT_WRITING_ADDON_PRICE = 50_000

export function formatRegistrationDateLabel(date?: string): string {
  if (!date) return 'Chọn ngày thi'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Chọn ngày thi'
  return `Ngày ${parsed.toLocaleDateString('vi-VN')}`
}

export function formatRegistrationSlotLabel(
  slot: SlotAvailability | null,
  fallback = 'Chọn thời gian thi',
): string {
  if (!slot) return fallback
  if (slot.time_slot?.trim()) return slot.time_slot.trim()
  const start = new Date(slot.start_time)
  const end = new Date(slot.end_time)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return fallback
  }
  const startLabel = start.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const endLabel = end.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${startLabel}-${endLabel}`
}

export function normalizeRetailRegistrationCatalog(
  payload: unknown,
): RetailRegistrationCatalog {
  if (!payload || typeof payload !== 'object') {
    return { writing_addons: [] }
  }

  const record = payload as RetailRegistrationCatalog & {
    products?: LegacyRetailProduct[]
    groups?: Array<{ products?: LegacyRetailProduct[] }>
  }

  const direct: RetailRegistrationCatalog = {
    lrw: record.lrw,
    speaking: record.speaking,
    writing_addons: record.writing_addons ?? [],
  }

  if (direct.lrw && direct.speaking) {
    return direct
  }

  const legacyProducts = [
    ...(record.products ?? []),
    ...(record.groups ?? []).flatMap((group) => group.products ?? []),
  ]

  if (legacyProducts.length === 0) {
    return direct
  }

  return mergeRetailRegistrationCatalog(direct, buildRetailCatalogFromLegacyProducts(legacyProducts))
}

type LegacyRetailProduct = RetailRegistrationProduct & {
  product_kind?: string
  lrw_enabled?: boolean
  speaking_enabled?: boolean
  requires_date_selection?: boolean
  writing_feedback?: WritingFeedbackMode
}

function retailRoleFromLegacy(product: LegacyRetailProduct): RetailRegistrationProduct['role'] | undefined {
  if (product.role) return product.role
  if (product.product_kind === 'addon') {
    return product.writing_feedback
  }
  if (product.product_kind === 'scheduled_exam' || product.product_kind === 'single_skill') {
    if (product.lrw_enabled && !product.speaking_enabled) return 'lrw'
    if (product.speaking_enabled && !product.lrw_enabled) return 'speaking'
    if (product.lrw_enabled) return 'lrw'
    if (product.speaking_enabled) return 'speaking'
    if (product.requires_date_selection) return 'lrw'
  }

  return inferRetailRoleFromName(product.name)
}

function inferRetailRoleFromName(name: string | undefined): RetailRegistrationProduct['role'] | undefined {
  const normalized = (name || '').toLowerCase()
  if (!normalized) return undefined
  if (normalized.includes('writing task 1') || normalized.includes('task 1')) return 'task1'
  if (normalized.includes('writing task 2') || normalized.includes('task 2')) return 'task2'
  if (normalized.includes('speaking')) return 'speaking'
  if (
    normalized.includes('l-r-w') ||
    normalized.includes('lrw') ||
    normalized.includes('listening') ||
    normalized.includes('reading - writing')
  ) {
    return 'lrw'
  }
  return undefined
}

function toRetailProduct(product: LegacyRetailProduct): RetailRegistrationProduct {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description,
    price: product.price,
    product_kind: product.product_kind,
    role: retailRoleFromLegacy(product),
    writing_feedback: product.writing_feedback,
  }
}

export function buildRetailCatalogFromLegacyProducts(
  products: LegacyRetailProduct[],
): RetailRegistrationCatalog {
  const catalog: RetailRegistrationCatalog = { writing_addons: [] }

  for (const product of products) {
    const item = toRetailProduct(product)
    const role = retailRoleFromLegacy(product)
    if (role === 'lrw' && !catalog.lrw) {
      catalog.lrw = item
      continue
    }
    if (role === 'speaking' && !catalog.speaking) {
      catalog.speaking = item
      continue
    }
    if (role === 'task1' || role === 'task2') {
      catalog.writing_addons.push(item)
    }
  }

  catalog.writing_addons.sort((left, right) =>
    (left.writing_feedback || left.role || '').localeCompare(right.writing_feedback || right.role || ''),
  )

  return catalog
}

export function mergeRetailRegistrationCatalog(
  primary: RetailRegistrationCatalog,
  fallback: RetailRegistrationCatalog,
): RetailRegistrationCatalog {
  return {
    lrw: primary.lrw ?? fallback.lrw,
    speaking: primary.speaking ?? fallback.speaking,
    writing_addons:
      primary.writing_addons.length > 0 ? primary.writing_addons : fallback.writing_addons,
  }
}

export function resolveWritingAddon(
  catalog: RetailRegistrationCatalog,
  mode: WritingFeedbackMode,
): RetailRegistrationProduct | undefined {
  return catalog.writing_addons.find(
    (addon) => addon.writing_feedback === mode || addon.role === mode,
  )
}

export function calculateRetailRegistrationTotal(
  catalog: RetailRegistrationCatalog,
  selectedAddons: Record<WritingFeedbackMode, boolean>,
): number {
  let total = catalog.lrw?.price ?? 0
  total += catalog.speaking?.price ?? 0

  for (const mode of ['task1', 'task2'] as WritingFeedbackMode[]) {
    if (!selectedAddons[mode]) continue
    const addon = resolveWritingAddon(catalog, mode)
    if (addon) {
      total += addon.price
    }
  }

  return total
}

export function isRetailRegistrationScheduleComplete(
  lrwDate: string | undefined,
  lrwSlot: SlotAvailability | null,
  speakingDate: string | undefined,
  speakingSlot: SlotAvailability | null,
): boolean {
  return Boolean(lrwDate && lrwSlot && speakingDate && speakingSlot)
}

export function isRetailRegistrationReady(
  catalog: RetailRegistrationCatalog | undefined,
  lrwDate: string | undefined,
  lrwSlot: SlotAvailability | null,
  speakingDate: string | undefined,
  speakingSlot: SlotAvailability | null,
): boolean {
  return Boolean(
    isRetailRegistrationScheduleComplete(lrwDate, lrwSlot, speakingDate, speakingSlot) &&
      catalog?.lrw?.id &&
      catalog?.speaking?.id,
  )
}

export type SpeakingSlotPeriod = 'morning' | 'afternoon' | 'evening'

const SPEAKING_PERIOD_LABELS: Record<SpeakingSlotPeriod, string> = {
  morning: 'Buổi sáng',
  afternoon: 'Buổi chiều',
  evening: 'Buổi tối',
}

export function formatRegistrationDateShort(date?: string): string {
  if (!date) return '—'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('vi-VN')
}

export function inferSpeakingSlotPeriod(slot: SlotAvailability): SpeakingSlotPeriod {
  const shift = (slot.shift_slot || '').toLowerCase()
  if (shift.includes('morning') || shift.includes('sang')) return 'morning'
  if (shift.includes('afternoon') || shift.includes('chieu')) return 'afternoon'
  if (shift.includes('evening') || shift.includes('toi')) return 'evening'

  const start = new Date(slot.start_time)
  if (Number.isNaN(start.getTime())) return 'morning'
  const hour = start.getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function groupSpeakingSlotsByPeriod(
  slots: SlotAvailability[],
): Array<{ period: SpeakingSlotPeriod; label: string; slots: SlotAvailability[] }> {
  const grouped: Record<SpeakingSlotPeriod, SlotAvailability[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  }

  for (const slot of slots) {
    grouped[inferSpeakingSlotPeriod(slot)].push(slot)
  }

  return (['morning', 'afternoon', 'evening'] as SpeakingSlotPeriod[])
    .map((period) => ({
      period,
      label: SPEAKING_PERIOD_LABELS[period],
      slots: grouped[period],
    }))
    .filter((group) => group.slots.length > 0)
}

export function selectedWritingFeedbackLabels(
  selected: Record<WritingFeedbackMode, boolean>,
): string[] {
  const labels: string[] = []
  if (selected.task1) labels.push('Writing Task 1')
  if (selected.task2) labels.push('Writing Task 2')
  return labels
}
