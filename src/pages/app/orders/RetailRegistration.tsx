import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RegistrationScheduleDialog } from '@/components/registration/RegistrationScheduleDialog'
import { RegistrationScheduleSection } from '@/components/registration/RegistrationScheduleSection'
import { RegistrationPaymentSection } from '@/components/registration/RegistrationPaymentSection'
import { RegistrationSummaryPanel } from '@/components/registration/RegistrationSummaryPanel'
import { SpeakingSlotDialog } from '@/components/registration/SpeakingSlotDialog'
import { WritingFeedbackAddonPicker } from '@/components/registration/WritingFeedbackAddonPicker'
import { ProductCatalogSections } from '@/components/order/ProductCatalogSections'
import { useProducts, useRetailRegistrationCatalog } from '@/api/products'
import { useCreateOrder, useRetailCheckout } from '@/api/orders'
import { useValidateVoucher } from '@/api/vouchers'
import api from '@/lib/axios'
import { formatCurrency } from '@/lib/formatters'
import { VoucherInput } from '@/components/order/VoucherInput'
import {
  buildPracticePackageOrderRequest,
  practicePackageCheckoutDestination,
} from '@/lib/practice-package-registration'
import {
  calculateRetailRegistrationTotal,
  formatRegistrationSlotLabel,
  isRetailRegistrationScheduleComplete,
  resolveWritingAddon,
} from '@/lib/retail-registration'
import type { SlotAvailability } from '@/types/booking'
import type { RetailCheckoutLineItem, Voucher } from '@/types/order'
import type { Product, WritingFeedbackMode } from '@/types/product'

type DialogTarget = 'lrw-date' | 'lrw-slot' | 'speaking-date' | null

export default function RetailRegistration() {
  const navigate = useNavigate()
  const { data: catalog, isLoading, isError, error } = useRetailRegistrationCatalog()
  const {
    data: practiceCatalog,
    isLoading: practiceCatalogLoading,
    isError: practiceCatalogIsError,
    error: practiceCatalogError,
  } = useProducts()
  const retailCheckout = useRetailCheckout()
  const practiceCheckout = useCreateOrder()

  const validateVoucher = useValidateVoucher()

  const [lrwDate, setLrwDate] = useState<string>()
  const [lrwSlot, setLrwSlot] = useState<SlotAvailability | null>(null)
  const [speakingDate, setSpeakingDate] = useState<string>()
  const [speakingSlot, setSpeakingSlot] = useState<SlotAvailability | null>(null)
  const [writingAddons, setWritingAddons] = useState<Record<WritingFeedbackMode, boolean>>({
    task1: true,
    task2: true,
  })
  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null)
  const [speakingSlotDialogOpen, setSpeakingSlotDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPracticeProduct, setSelectedPracticeProduct] = useState<Product | null>(null)
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [voucherDiscount, setVoucherDiscount] = useState(0)
  const [practiceVoucher, setPracticeVoucher] = useState<Voucher | null>(null)
  const [practiceVoucherDiscount, setPracticeVoucherDiscount] = useState(0)

  const subtotal = useMemo(
    () => calculateRetailRegistrationTotal(catalog ?? { writing_addons: [] }, writingAddons),
    [catalog, writingAddons],
  )

  const payableTotal = Math.max(subtotal - voucherDiscount, 0)

  const scheduleComplete = isRetailRegistrationScheduleComplete(
    lrwDate,
    lrwSlot,
    speakingDate,
    speakingSlot,
  )

  const submitHint = useMemo(() => {
    if (!scheduleComplete) {
      if (!lrwDate || !lrwSlot) return 'Vui lòng chọn đủ lịch thi L-R-W.'
      return 'Vui lòng chọn đủ lịch thi Speaking.'
    }
    if (!catalog?.lrw?.id || !catalog?.speaking?.id) {
      return 'Hệ thống chưa map được SKU đăng ký lẻ L-R-W/Speaking. Vẫn có thể bấm thanh toán để xem lỗi chi tiết từ API.'
    }
    return undefined
  }, [catalog, lrwDate, lrwSlot, speakingDate, speakingSlot, scheduleComplete])

  const openDialog = (target: DialogTarget) => setDialogTarget(target)

  const toggleWritingAddon = (mode: WritingFeedbackMode) => {
    setWritingAddons((current) => ({ ...current, [mode]: !current[mode] }))
  }

  const buildScheduledLineItem = (
    productId: string,
    date: string,
    slot: SlotAvailability,
  ): RetailCheckoutLineItem => ({
    product_id: productId,
    quantity: 1,
    selected_date: date,
    time_slot: slot.time_slot || formatRegistrationSlotLabel(slot),
    time_slot_id: slot.slot_id,
  })

  const patchAppointmentFeedback = async (
    appointmentId: number | undefined,
    feedback: Record<WritingFeedbackMode, boolean>,
  ) => {
    if (!appointmentId) return
    await api.patch(`/api/v1/appointments/${appointmentId}`, {
      feedback_writing_1: feedback.task1,
      feedback_writing_2: feedback.task2,
    })
  }

  const handleSubmit = async () => {
    if (!scheduleComplete) {
      toast.error('Vui lòng chọn đủ lịch thi L-R-W và Speaking')
      return
    }
    if (!catalog?.lrw?.id || !lrwDate || !lrwSlot) {
      toast.error('Chưa map được sản phẩm L-R-W để tạo đơn thanh toán')
      return
    }
    if (!catalog.speaking?.id || !speakingDate || !speakingSlot) {
      toast.error('Chưa map được sản phẩm Speaking để tạo đơn thanh toán')
      return
    }

    setIsSubmitting(true)
    try {
      const lineItems: RetailCheckoutLineItem[] = [
        buildScheduledLineItem(catalog.lrw.id, lrwDate, lrwSlot),
        buildScheduledLineItem(catalog.speaking.id, speakingDate, speakingSlot),
      ]

      const addonModes = (['task1', 'task2'] as WritingFeedbackMode[]).filter(
        (mode) => writingAddons[mode],
      )
      for (const mode of addonModes) {
        const addon = resolveWritingAddon(catalog, mode)
        if (!addon) continue
        lineItems.push({
          product_id: addon.id,
          quantity: 1,
        })
      }

      const order = await retailCheckout.mutateAsync({
        line_items: lineItems,
        voucher_code: voucher?.code,
        total: payableTotal,
      })

      await patchAppointmentFeedback(order.appointment_id, writingAddons)

      console.log('[VNPay] Retail checkout order:', order)

      if (order.payment_url) {
        console.log('[VNPay] Payment URL:', order.payment_url)
        window.location.href = order.payment_url
        return
      }

      toast.success('Đăng ký lẻ đã được tạo', {
        description: 'Kiểm tra đơn hàng và lịch hẹn của bạn.',
      })
      navigate(`/app/orders/${order.order_id}`)
    } catch (submitError) {
      toast.error('Không tạo được đăng ký lẻ', {
        description:
          submitError instanceof Error ? submitError.message : 'Vui lòng thử lại sau.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePracticePackageSubmit = async () => {
    if (!selectedPracticeProduct) {
      toast.error('Vui lòng chọn một gói luyện thi')
      return
    }

    // Pre-validate voucher server-side before submitting order
    if (practiceVoucher?.code) {
      try {
        const validation = await validateVoucher.mutateAsync({
          code: practiceVoucher.code,
          orderTotal: selectedPracticeProduct.price,
          applicableScope: 'package',
        })
        if (!validation.valid) {
          toast.error(validation.message ?? 'Mã voucher không hợp lệ cho gói luyện thi này.')
          return
        }
      } catch (validationError) {
        toast.error(
          validationError instanceof Error
            ? validationError.message
            : 'Không xác minh được voucher. Vui lòng thử lại.',
        )
        return
      }
    }

    try {
      const result = await practiceCheckout.mutateAsync(
        buildPracticePackageOrderRequest(
          selectedPracticeProduct,
          practiceVoucher?.code,
          selectedPracticeProduct.price - practiceVoucherDiscount,
        ),
      )

      if (result.payment_url) {
        window.location.href = result.payment_url
        return
      }

      toast.success('Đã tạo đăng ký gói luyện thi', {
        description:
          result.order.status === 'paid'
            ? 'Gói đã được kích hoạt, bạn có thể vào luyện thi ngay.'
            : 'Hoàn tất thanh toán để kích hoạt gói luyện thi.',
      })
      navigate(practicePackageCheckoutDestination(result))
    } catch (submitError) {
      toast.error('Không tạo được đăng ký gói luyện thi', {
        description:
          submitError instanceof Error ? submitError.message : 'Vui lòng thử lại sau.',
      })
    }
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h1 className="text-lg font-semibold text-destructive">Không tải được đăng ký lẻ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Vui lòng thử lại sau.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Đăng ký lẻ</h1>
        <p className="mt-2 text-muted-foreground">
          Chọn lịch thi, feedback Writing và thanh toán phí thi trong cùng một màn hình.
        </p>
      </div>

      <Tabs defaultValue="retail" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:w-[420px]">
          <TabsTrigger value="retail">Đăng ký lẻ</TabsTrigger>
          <TabsTrigger value="practice">Gói luyện thi</TabsTrigger>
        </TabsList>

        <TabsContent value="retail" className="mt-0">
          {isLoading ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <RegistrationScheduleSection
                  title="Lịch thi Listening - Reading - Writing"
                  date={lrwDate}
                  slot={lrwSlot}
                  sessionPrefix="Ca thi L-R-W"
                  onReselectDate={() => openDialog('lrw-date')}
                  onReselectSlot={() => openDialog('lrw-slot')}
                />

                <WritingFeedbackAddonPicker
                  addons={catalog?.writing_addons ?? []}
                  selected={writingAddons}
                  onToggle={toggleWritingAddon}
                />

                <RegistrationScheduleSection
                  title="Lịch thi Speaking"
                  date={speakingDate}
                  slot={speakingSlot}
                  sessionPrefix="Ca thi Speaking"
                  onReselectDate={() => openDialog('speaking-date')}
                  onReselectSlot={() => {
                    if (!speakingDate) {
                      openDialog('speaking-date')
                      return
                    }
                    setSpeakingSlotDialogOpen(true)
                  }}
                />

                <RegistrationPaymentSection
                  subtotal={subtotal}
                  discount={voucherDiscount}
                  total={payableTotal}
                  isSubmitting={isSubmitting}
                  disabled={!scheduleComplete}
                  submitHint={submitHint}
                  onSubmit={handleSubmit}
                  onApplyVoucher={(appliedVoucher, discountAmount) => {
                    setVoucher(appliedVoucher)
                    setVoucherDiscount(discountAmount)
                    toast.success('Đã áp dụng voucher', {
                      description: `Giảm ${formatCurrency(discountAmount)}`,
                    })
                  }}
                  onRemoveVoucher={() => {
                    setVoucher(null)
                    setVoucherDiscount(0)
                  }}
                />
              </div>

              <RegistrationSummaryPanel
                lrwDate={lrwDate}
                lrwSlot={lrwSlot}
                speakingDate={speakingDate}
                speakingSlot={speakingSlot}
                writingAddons={writingAddons}
                subtotal={subtotal}
                discount={voucherDiscount}
                total={payableTotal}
                canSubmit={scheduleComplete}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="practice" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="rounded-lg border bg-card p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <PackageCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Đăng ký gói luyện thi</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Chọn gói luyện tập 3 hoặc 4 kỹ năng. Sau khi thanh toán thành công,
                      gói sẽ xuất hiện ở Gói đã mua để bắt đầu luyện Listening, Reading,
                      Writing hoặc Speaking.
                    </p>
                  </div>
                </div>
              </div>

              {practiceCatalogIsError ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {practiceCatalogError instanceof Error
                      ? practiceCatalogError.message
                      : 'Không tải được gói luyện thi.'}
                  </p>
                </div>
              ) : (
                <ProductCatalogSections
                  groups={practiceCatalog?.groups ?? []}
                  isLoading={practiceCatalogLoading}
                  selectedProductId={selectedPracticeProduct?.id}
                  onSelect={setSelectedPracticeProduct}
                  showSelectButton
                  loadingCount={6}
                />
              )}
            </div>

            <aside className="h-fit rounded-lg border bg-card p-5 lg:sticky lg:top-6">
              <h2 className="font-semibold">Tóm tắt gói luyện thi</h2>
              {selectedPracticeProduct ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="font-medium">{selectedPracticeProduct.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedPracticeProduct.package_group === 'three_skill'
                        ? 'Listening, Reading, Writing'
                        : 'Listening, Reading, Writing, Speaking'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <VoucherInput
                      orderSubtotal={selectedPracticeProduct.price}
                      applicableScope="package"
                      onApply={(v) => {
                        setPracticeVoucher(v)
                        setPracticeVoucherDiscount(
                          v.type === 'percentage'
                            ? Math.min(
                                (selectedPracticeProduct.price * v.value) / 100,
                                v.max_discount ?? Infinity,
                              )
                            : v.value,
                        )
                      }}
                      onRemove={() => {
                        setPracticeVoucher(null)
                        setPracticeVoucherDiscount(0)
                      }}
                      compact
                    />
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Giá gói</span>
                      <span>{formatCurrency(selectedPracticeProduct.price)}</span>
                    </div>
                    {practiceVoucherDiscount > 0 && (
                      <div className="flex items-center justify-between text-green-600">
                        <span>Giảm giá</span>
                        <span>-{formatCurrency(practiceVoucherDiscount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t pt-2 font-semibold">
                      <span>Thanh toán</span>
                      <span className="text-primary">
                        {formatCurrency(selectedPracticeProduct.price - practiceVoucherDiscount)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Chọn một gói để tạo đơn thanh toán gói luyện thi.
                </p>
              )}

              <Button
                className="mt-5 w-full"
                size="lg"
                disabled={!selectedPracticeProduct || practiceCheckout.isPending}
                onClick={handlePracticePackageSubmit}
              >
                {practiceCheckout.isPending ? 'Đang tạo đơn...' : 'Đăng ký gói luyện thi'}
              </Button>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => navigate('/app/packages')}
              >
                Vào gói đã mua
              </Button>
            </aside>
          </div>
        </TabsContent>
      </Tabs>

      <RegistrationScheduleDialog
        open={dialogTarget === 'lrw-date' || dialogTarget === 'lrw-slot'}
        kind="lrw"
        title="Chọn lịch thi L-R-W"
        selectedDate={lrwDate}
        selectedSlot={lrwSlot}
        onOpenChange={(open) => {
          if (!open) setDialogTarget(null)
        }}
        onConfirm={(date, slot) => {
          setLrwDate(date)
          setLrwSlot(slot)
          setDialogTarget(null)
        }}
      />

      <RegistrationScheduleDialog
        open={dialogTarget === 'speaking-date'}
        kind="speaking"
        title="Chọn ngày thi Speaking"
        selectedDate={speakingDate}
        selectedSlot={speakingSlot}
        onOpenChange={(open) => {
          if (!open) setDialogTarget(null)
        }}
        onConfirm={(date, slot) => {
          setSpeakingDate(date)
          setSpeakingSlot(slot)
          setDialogTarget(null)
        }}
      />

      <SpeakingSlotDialog
        open={speakingSlotDialogOpen}
        date={speakingDate}
        selectedSlot={speakingSlot}
        onOpenChange={setSpeakingSlotDialogOpen}
        onSelect={setSpeakingSlot}
      />
    </div>
  )
}
