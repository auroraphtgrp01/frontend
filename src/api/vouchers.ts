import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { getApiErrorDetails, unwrapApiData } from '@/lib/api-envelope'
import type { ValidateVoucherResponse, Voucher, VoucherApplicableScope } from '@/types/order'

type ValidateVoucherApiResponse = {
  valid: boolean
  discount_amount?: number
  new_total?: number
  message?: string
  usage_remaining?: number
  user_usage_remaining?: number
  voucher?: {
    code: string
    type: Voucher['type']
    value: number
    max_discount?: number
    min_order_amount?: number
    is_valid?: boolean
  }
}

function voucherValidateErrorMessage(code?: string, fallback?: string): string {
  switch (code) {
    case 'VOUCHER_NOT_FOUND':
      return 'Mã voucher không tồn tại.'
    case 'VOUCHER_EXPIRED':
      return 'Mã voucher đã hết hạn.'
    case 'VOUCHER_NOT_STARTED':
      return 'Mã voucher chưa có hiệu lực.'
    case 'VOUCHER_INACTIVE':
      return 'Mã voucher không còn hiệu lực.'
    case 'VOUCHER_LIMIT_REACHED':
      return 'Mã voucher đã hết lượt dùng.'
    case 'VOUCHER_LIMIT_PER_USER':
      return 'Bạn đã dùng hết lượt voucher cho mã này.'
    case 'VOUCHER_MIN_AMOUNT':
      return 'Đơn chưa đạt giá trị tối thiểu để dùng voucher.'
    case 'VOUCHER_NOT_APPLICABLE':
      return 'Mã voucher không áp dụng cho đơn này.'
    case 'VOUCHER_INVALID_LIMIT':
      return 'Cấu hình voucher không hợp lệ.'
    case 'VALIDATION_ERROR':
      return fallback ?? 'Thông tin voucher không hợp lệ.'
    case 'BAD_REQUEST':
      return fallback ?? 'Thiếu thông tin academy để kiểm tra voucher.'
    default:
      return fallback ?? 'Không áp dụng được voucher.'
  }
}

export const useValidateVoucher = () => {
  return useMutation({
    mutationFn: async ({
      code,
      orderTotal,
      applicableScope,
    }: {
      code: string
      orderTotal?: number
      applicableScope?: VoucherApplicableScope
    }): Promise<ValidateVoucherResponse> => {
      const response = await api.post(
        '/api/v1/vouchers/validate',
        {
          code,
          total: orderTotal ?? 0,
          applicable_scope: applicableScope,
        },
        { skipErrorToast: true },
      )
      const payload = unwrapApiData<ValidateVoucherApiResponse>(response.data)
      return {
        valid: payload.valid,
        discount_amount: payload.discount_amount,
        new_total: payload.new_total,
        message: payload.message,
        usage_remaining: payload.usage_remaining,
        user_usage_remaining: payload.user_usage_remaining,
        voucher: payload.voucher
          ? {
              code: payload.voucher.code,
              type: payload.voucher.type,
              value: payload.voucher.value,
              max_discount: payload.voucher.max_discount,
              min_order_amount: payload.voucher.min_order_amount,
              is_valid: payload.voucher.is_valid ?? true,
            }
          : undefined,
      }
    },
  })
}

// ============================================================
// Voucher Hook with State Management
// ============================================================

export interface VoucherState {
  code: string
  voucher: Voucher | null
  discountAmount: number
  usageRemaining?: number
  userUsageRemaining?: number
  isValid: boolean
  error: string | null
}

export const useVoucherInput = (onValidVoucher?: (voucher: Voucher, discountAmount: number) => void) => {
  const [voucherState, setVoucherState] = useState<VoucherState>({
    code: '',
    voucher: null,
    discountAmount: 0,
    isValid: false,
    error: null,
  })

  const validateMutation = useValidateVoucher()

  const applyVoucher = async (code: string, orderTotal?: number, applicableScope?: VoucherApplicableScope) => {
    if (!code.trim()) {
      setVoucherState({
        code: '',
        voucher: null,
        discountAmount: 0,
        isValid: false,
        error: 'Please enter a voucher code',
      })
      return
    }

    try {
      const result = await validateMutation.mutateAsync({ code: code.trim(), orderTotal, applicableScope })

      if (result.valid && result.voucher) {
        setVoucherState({
          code: result.voucher.code,
          voucher: result.voucher,
          discountAmount: result.discount_amount || 0,
          usageRemaining: result.usage_remaining,
          userUsageRemaining: result.user_usage_remaining,
          isValid: true,
          error: null,
        })
        onValidVoucher?.(result.voucher, result.discount_amount || 0)
      } else {
        setVoucherState({
          code,
          voucher: null,
          discountAmount: 0,
          isValid: false,
          error: result.message || 'Invalid voucher code',
        })
      }
    } catch (error) {
      const body = isAxiosError(error) ? error.response?.data : undefined
      const { code, message } = getApiErrorDetails(body)
      setVoucherState((prev) => ({
        ...prev,
        isValid: false,
        error: voucherValidateErrorMessage(code, message),
      }))
    }
  }

  const removeVoucher = () => {
    setVoucherState({
      code: '',
      voucher: null,
      discountAmount: 0,
      isValid: false,
      error: null,
    })
  }

  const clearError = () => {
    setVoucherState((prev) => ({ ...prev, error: null }))
  }

  return {
    ...voucherState,
    isValidating: validateMutation.isPending,
    applyVoucher,
    removeVoucher,
    clearError,
  }
}

// ============================================================
// Calculate Discount
// ============================================================

export const calculateDiscount = (
  subtotal: number,
  voucher: Voucher | null
): { discountAmount: number; finalTotal: number } => {
  if (!voucher) {
    return { discountAmount: 0, finalTotal: subtotal }
  }

  let discountAmount = 0

  if (voucher.type === 'percentage') {
    discountAmount = (subtotal * voucher.value) / 100
  } else if (voucher.type === 'fixed') {
    discountAmount = voucher.value
  }

  if (voucher.max_discount && discountAmount > voucher.max_discount) {
    discountAmount = voucher.max_discount
  }

  if (discountAmount > subtotal) {
    discountAmount = subtotal
  }

  return {
    discountAmount,
    finalTotal: subtotal - discountAmount,
  }
}
