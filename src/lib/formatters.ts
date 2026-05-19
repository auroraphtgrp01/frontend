import {
  ORDER_STATUS_LABELS,
  EXAM_MODE_LABELS,
  SKILL_LABELS,
  ATTEMPT_STATUS_LABELS,
  ROLE_LABELS,
} from './constants'

// ============================================================
// Currency Formatter
// ============================================================

export const formatCurrency = (
  amount: number,
  currency: string = 'VND',
  locale: string = 'vi-VN'
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 đ'
  }

  if (currency === 'VND') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatPrice = formatCurrency

// ============================================================
// Date Formatters
// ============================================================

export const formatDate = (
  date: string | Date | undefined,
  format: 'full' | 'short' | 'time' | 'datetime' | 'relative' = 'full',
  locale: string = 'vi-VN'
): string => {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) return '-'

  switch (format) {
    case 'full':
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj)

    case 'short':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(dateObj)

    case 'time':
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj)

    case 'datetime':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj)

    case 'relative':
      return formatRelativeTime(dateObj, locale)

    default:
      return new Intl.DateTimeFormat(locale).format(dateObj)
  }
}

export const formatDateRange = (
  startDate: string | Date,
  endDate: string | Date,
  locale: string = 'vi-VN'
): string => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-'

  const startStr = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(start)

  const endStr = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(end)

  return `${startStr} - ${endStr}`
}

const formatRelativeTime = (date: Date, locale: string = 'vi-VN'): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return locale === 'vi-VN' ? 'Vừa xong' : 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return locale === 'vi-VN'
      ? `${diffInMinutes} phút trước`
      : `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return locale === 'vi-VN'
      ? `${diffInHours} giờ trước`
      : `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return locale === 'vi-VN'
      ? `${diffInDays} ngày trước`
      : `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return locale === 'vi-VN'
      ? `${diffInWeeks} tuần trước`
      : `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`
  }

  return formatDate(date, 'short', locale)
}

// ============================================================
// Band Score Formatter
// ============================================================

export const formatBandScore = (score: number | undefined | null): string => {
  if (score === undefined || score === null || isNaN(score)) return '-'

  if (score === Math.floor(score)) {
    return `${score}.0`
  }

  return score.toFixed(1)
}

export const formatOverallBand = (scores: {
  listening?: number
  reading?: number
  writing?: number
  speaking?: number
}): string => {
  const validScores = [
    scores.listening,
    scores.reading,
    scores.writing,
    scores.speaking,
  ].filter((s): s is number => s !== undefined && s !== null)

  if (validScores.length === 0) return '-'

  const average = validScores.reduce((sum, s) => sum + s, 0) / validScores.length
  const rounded = Math.round(average * 2) / 2

  return formatBandScore(rounded)
}

// ============================================================
// Duration Formatter
// ============================================================

export const formatDuration = (minutes: number, locale: string = 'vi-VN'): string => {
  if (!minutes || isNaN(minutes)) return '-'

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (locale === 'vi-VN') {
    if (hours === 0) return `${mins}p`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}p`
  }

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export const formatExamDuration = (minutes: number): string => {
  return formatDuration(minutes, 'vi-VN')
}

// ============================================================
// Exam Mode Formatter
// ============================================================

export const formatExamMode = (mode: string | undefined): string => {
  if (!mode) return '-'
  return EXAM_MODE_LABELS[mode] || mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================
// Order Status Formatter
// ============================================================

export const formatOrderStatus = (status: string | undefined): string => {
  if (!status) return '-'
  return ORDER_STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================
// Skill Formatter
// ============================================================

export const formatSkill = (skill: string | undefined): string => {
  if (!skill) return '-'
  return SKILL_LABELS[skill] || skill.charAt(0).toUpperCase() + skill.slice(1)
}

// ============================================================
// Attempt Status Formatter
// ============================================================

export const formatAttemptStatus = (status: string | undefined): string => {
  if (!status) return '-'
  return ATTEMPT_STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================
// Role Formatter
// ============================================================

export const formatRole = (role: string | undefined): string => {
  if (!role) return '-'
  return (
    ROLE_LABELS[role] ||
    role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

// ============================================================
// Phone Formatter
// ============================================================

export const formatPhone = (phone: string | undefined): string => {
  if (!phone) return '-'

  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }

  return phone
}

// ============================================================
// Order ID Formatter
// ============================================================

export const formatOrderId = (id: string | undefined): string => {
  if (!id) return '-'
  if (id.length <= 8) return id.toUpperCase()
  return `${id.slice(0, 4).toUpperCase()}...${id.slice(-4).toUpperCase()}`
}

// ============================================================
// Truncate Text
// ============================================================

export const truncate = (text: string | undefined, maxLength: number): string => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

// ============================================================
// File Size Formatter
// ============================================================

export const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes || bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// ============================================================
// Percentage Formatter
// ============================================================

export const formatPercentage = (value: number | undefined, decimals: number = 0): string => {
  if (value === undefined || value === null || isNaN(value)) return '0%'
  return `${value.toFixed(decimals)}%`
}
