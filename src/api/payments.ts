import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { VNPayCallbackParams, PaymentResult, OrderStatusResponse, Order } from '@/types/order'

// ============================================================
// VNPay Callback
// ============================================================

export const useVNPayCallback = (params: VNPayCallbackParams) => {
  return useQuery({
    queryKey: ['vnpay-callback', params],
    queryFn: async () => {
      const response = await api.post<PaymentResult>('/api/v1/payments/vnpay/callback', params)
      return response.data
    },
    enabled: !!params.order_id && !!params.code,
    retry: false,
  })
}

export const useVNPayRedirect = () => {
  const redirectToVNPay = useCallback((paymentUrl: string) => {
    window.location.href = paymentUrl
  }, [])

  const createOrderAndRedirect = useCallback(async (): Promise<{ paymentUrl?: string; orderId?: string; error?: string }> => {
    return { error: 'Use useCreateOrder hook directly' }
  }, [])

  return { redirectToVNPay, createOrderAndRedirect }
}

// ============================================================
// Order Status Polling
// ============================================================

export const usePollOrderStatus = (
  orderId: string,
  options?: {
    enabled?: boolean
    interval?: number
    maxAttempts?: number
    onStatusChange?: (status: string) => void
  }
) => {
  const { enabled = true, interval = 2000, maxAttempts = 30, onStatusChange } = options || {}
  const [attempts, setAttempts] = useState(0)
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const queryClient = useQueryClient()

  const { data: statusData, error, isLoading, isError } = useQuery<OrderStatusResponse>({
    queryKey: ['order-status-poll', orderId, attempts],
    queryFn: async () => {
      const response = await api.get<OrderStatusResponse>(`/api/v1/orders/${orderId}/status`)
      return response.data
    },
    enabled: !!orderId && enabled && isPolling,
    refetchInterval: interval,
    retry: false,
    staleTime: 0,
  })

  useEffect(() => {
    if (!enabled || !orderId) {
      setIsPolling(false)
      return
    }

    setIsPolling(true)
    setAttempts(0)

    return () => {
      setIsPolling(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, orderId])

  useEffect(() => {
    if (statusData?.status) {
      onStatusChange?.(statusData.status)
    }
  }, [statusData?.status, onStatusChange])

  useEffect(() => {
    if (attempts >= maxAttempts) {
      setIsPolling(false)
    }
  }, [attempts, maxAttempts])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  const startPolling = useCallback(() => {
    setIsPolling(true)
    setAttempts(0)
  }, [])

  const resetPolling = useCallback(() => {
    setAttempts(0)
    setIsPolling(true)
    queryClient.invalidateQueries({ queryKey: ['order-status-poll', orderId] })
  }, [orderId, queryClient])

  return {
    statusData,
    isPolling,
    attempts,
    maxAttempts,
    isLoading,
    error,
    isError,
    isComplete: !isPolling && attempts >= maxAttempts,
    stopPolling,
    startPolling,
    resetPolling,
  }
}

// ============================================================
// Payment Verification
// ============================================================

export const useVerifyPayment = () => {
  const queryClient = useQueryClient()

  return {
    verifyTransaction: async (orderId: string, transactionId: string): Promise<Order> => {
      const response = await api.post<Order>(`/api/v1/payments/verify`, {
        order_id: orderId,
        transaction_id: transactionId,
      })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      return response.data
    },
  }
}

// ============================================================
// Parse VNPay URL Parameters
// ============================================================

export const parseVNPayCallback = (searchParams: URLSearchParams): VNPayCallbackParams => {
  console.log('[VNPay] parseVNPayCallback input:', Object.fromEntries(searchParams.entries()))
  
  const code = searchParams.get('code') || searchParams.get('vnp_ResponseCode') || ''
  const message = searchParams.get('message') || ''
  const orderId = searchParams.get('order_id') || searchParams.get('vnp_TxnRef') || ''
  const amount = searchParams.get('amount') ? Number(searchParams.get('amount')) : undefined
  const transactionNo = searchParams.get('transaction_no') || searchParams.get('vnp_TransactionNo') || undefined
  const transactionDate = searchParams.get('transaction_date') || searchParams.get('vnp_PayDate') || undefined
  const transactionStatus = searchParams.get('vnp_TransactionStatus') || undefined

  console.log('[VNPay] parseVNPayCallback output:', { code, orderId, transactionStatus })

  return {
    code,
    message,
    order_id: orderId,
    amount,
    transaction_no: transactionNo,
    transaction_date: transactionDate,
  }
}

// ============================================================
// Payment Status Helpers
// ============================================================

export const isPaymentSuccessful = (params: VNPayCallbackParams): boolean => {
  const successCodes = ['00', '07', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29']
  return successCodes.includes(params.code) || params.code === '00'
}

export const isPaymentPending = (params: VNPayCallbackParams): boolean => {
  return params.code === '01' || params.code === '02'
}

export const isPaymentFailed = (params: VNPayCallbackParams): boolean => {
  return params.code !== '00' && !isPaymentPending(params)
}
